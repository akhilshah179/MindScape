import crypto from 'crypto'
import { PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDb from '../config/dynamoDb.js'
import {
  objectKeys, putObject, getObjectStream, getObjectBuffer, deleteObjects, legacyLocalPath, openLocalFile, STORAGE_MODE
} from '../services/storageService.js'
import { extractPdfText, chunkPages, isPdfBuffer } from '../services/documentService.js'
import { generateDocumentSummary, generateDocumentQuiz } from '../services/aiService.js'
import { withLock } from '../services/lock.js'
import { HttpError } from '../middleware/http.js'

const T_FILES = 'studymate_files'
const T_SUMMARIES = 'studymate_summaries'
const T_QUIZZES = 'studymate_quizzes'
const T_SCORES = 'studymate_scores'
export const MAX_FILE_SIZE = 25 * 1024 * 1024

const publicFile = (f) => ({
  fileId: f.fileId, subjectName: f.subjectName, originalName: f.originalName, name: f.originalName,
  size: f.size, mimeType: f.mimeType, uploadedAt: f.uploadedAt, status: f.status || 'ready',
  numPages: f.numPages ?? null, hasText: f.textChars == null ? null : f.textChars > 30,
  storage: f.storageType, hasSummary: Boolean(f.hasSummary), hasQuiz: Boolean(f.hasQuiz)
})

/** Ownership is enforced by the key itself: (userId, fileId). Another user's file is simply "not found". */
export async function getOwnedFile(userId, fileId) {
  const { Item } = await dynamoDb.send(new GetCommand({ TableName: T_FILES, Key: { userId, fileId: String(fileId) } }))
  if (!Item) throw new HttpError(404, 'File not found.')
  return Item
}

/**
 * Text chunks for a file, extracting lazily for files uploaded before server-side extraction.
 * Serialized per file so concurrent summary/quiz/chat requests extract only once.
 */
export function getFileChunks(file) {
  return withLock(`text:${file.fileId}`, async () => {
    const keys = objectKeys(file.userId, file.fileId)
    const cached = await getObjectBuffer(keys.text).catch(() => null)
    if (cached) return JSON.parse(cached.toString('utf8')).chunks

    const pdf = await readPdfBuffer(file)
    if (!pdf) throw new HttpError(404, 'The PDF content is missing from storage.')
    const { pages, numPages } = await extractPdfText(pdf)
    const chunks = chunkPages(pages)
    await putObject(keys.text, Buffer.from(JSON.stringify({ numPages, chunks })), 'application/json')
    const textChars = chunks.reduce((s, c) => s + c.text.length, 0)
    await dynamoDb.send(new UpdateCommand({
      TableName: T_FILES, Key: { userId: file.userId, fileId: file.fileId },
      UpdateExpression: 'SET numPages = :n, textChars = :c', ExpressionAttributeValues: { ':n': numPages, ':c': textChars }
    }))
    return chunks
  })
}

async function readPdfBuffer(file) {
  const legacy = legacyLocalPath(file)
  if (legacy) {
    const r = await openLocalFile(legacy)
    if (!r || r.invalidRange) return null
    const parts = []
    for await (const c of r.stream) parts.push(c)
    return Buffer.concat(parts)
  }
  return getObjectBuffer(file.objectKey || objectKeys(file.userId, file.fileId).pdf)
}

// POST /files/upload  (multipart: file, subjectName)
export const uploadFile = async (req, res) => {
  const userId = req.user.userId
  if (!req.file) throw new HttpError(400, 'No file was uploaded. Please select a PDF file.')
  const { originalname, buffer, size } = req.file
  if (size > MAX_FILE_SIZE) throw new HttpError(413, 'File is too large. Maximum size is 25 MB.')
  // Check the actual bytes; MIME type and extension are client-controlled.
  if (!isPdfBuffer(buffer)) throw new HttpError(400, 'Invalid file. Only PDF documents are allowed.')

  const subjectName = String(req.body.subjectName || 'General').trim().slice(0, 80) || 'General'
  const originalName = String(originalname || 'document.pdf').replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 200)
  const fileId = crypto.randomUUID()
  const keys = objectKeys(userId, fileId)

  // Extract first: corrupt/encrypted PDFs are rejected before anything is stored.
  const { pages, numPages } = await extractPdfText(buffer)
  const chunks = chunkPages(pages)
  const textChars = chunks.reduce((s, c) => s + c.text.length, 0)

  await putObject(keys.pdf, buffer, 'application/pdf', { userId, fileId, originalName, subjectName })
  try {
    await putObject(keys.text, Buffer.from(JSON.stringify({ numPages, chunks })), 'application/json')
    const record = {
      userId, fileId, subjectName, originalName, mimeType: 'application/pdf', size,
      storageType: STORAGE_MODE, objectKey: keys.pdf, numPages, textChars,
      uploadedAt: new Date().toISOString(), status: 'ready'
    }
    await dynamoDb.send(new PutCommand({ TableName: T_FILES, Item: record }))
    res.status(201).json({
      success: true,
      message: textChars > 30 ? 'PDF uploaded.' : 'PDF uploaded, but it contains no selectable text (scanned images). AI features need OCR for this file.',
      file: publicFile(record)
    })
  } catch (err) {
    // Don't leave orphaned objects if metadata could not be saved.
    await deleteObjects([keys.pdf, keys.text]).catch(e => console.error('[files] cleanup failed:', e.message))
    throw err
  }
}

// GET /files[?subjectName=]
export const getFiles = async (req, res) => {
  const params = { TableName: T_FILES, KeyConditionExpression: 'userId = :uid', ExpressionAttributeValues: { ':uid': req.user.userId } }
  if (req.query.subjectName) {
    params.FilterExpression = 'subjectName = :s'
    params.ExpressionAttributeValues[':s'] = String(req.query.subjectName)
  }
  const { Items = [] } = await dynamoDb.send(new QueryCommand(params))
  Items.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
  res.json({ success: true, files: Items.map(publicFile) })
}

// GET /files/:fileId
export const getFileMetadata = async (req, res) => {
  res.json({ success: true, file: publicFile(await getOwnedFile(req.user.userId, req.params.fileId)) })
}

// GET /files/:fileId/content  — streams the PDF with HTTP Range support (pdf.js loads pages on demand)
export const getFileContent = async (req, res) => {
  const file = await getOwnedFile(req.user.userId, req.params.fileId)
  const range = req.headers.range
  const legacy = legacyLocalPath(file)
  const obj = legacy
    ? await openLocalFile(legacy, range)
    : await getObjectStream(file.objectKey || objectKeys(file.userId, file.fileId).pdf, range, file.size)

  if (!obj) throw new HttpError(404, 'The PDF content is missing from storage.')
  if (obj.invalidRange) {
    res.setHeader('Content-Range', `bytes */${obj.size ?? file.size}`)
    return res.status(416).end()
  }

  const disposition = req.query.download === '1' ? 'attachment' : 'inline'
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName || 'document.pdf')}`)
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Length', obj.end - obj.start + 1)
  if (obj.partial) {
    res.status(206)
    res.setHeader('Content-Range', `bytes ${obj.start}-${obj.end}/${obj.size}`)
  }
  obj.stream.on('error', (err) => {
    console.error('[files] stream error:', err.message)
    res.destroy(err)
  })
  req.on('close', () => obj.stream.destroy?.())
  obj.stream.pipe(res)
}

// DELETE /files/:fileId
export const deleteFile = async (req, res) => {
  const userId = req.user.userId
  const file = await getOwnedFile(userId, req.params.fileId)
  const keys = objectKeys(userId, file.fileId)
  const legacy = legacyLocalPath(file)
  // Remove stored objects first; if that fails the record stays so the user can retry.
  await deleteObjects([keys.pdf, keys.text])
  if (legacy) await import('fs').then(fs => fs.promises.rm(legacy, { force: true }))
  await Promise.all([
    dynamoDb.send(new DeleteCommand({ TableName: T_FILES, Key: { userId, fileId: file.fileId } })),
    dynamoDb.send(new DeleteCommand({ TableName: T_SUMMARIES, Key: { userId, fileId: file.fileId } })),
    dynamoDb.send(new DeleteCommand({ TableName: T_QUIZZES, Key: { userId, fileId: file.fileId } }))
  ])
  res.json({ success: true, fileId: file.fileId })
}

// GET /files/:fileId/summary
export const getFileSummary = async (req, res) => {
  const file = await getOwnedFile(req.user.userId, req.params.fileId)
  const { Item } = await dynamoDb.send(new GetCommand({ TableName: T_SUMMARIES, Key: { userId: file.userId, fileId: file.fileId } }))
  res.json({ success: true, cached: Boolean(Item), summary: Item || null })
}

// POST /files/:fileId/summary  { forceRegenerate? }
export const generateOrGetFileSummary = async (req, res) => {
  const file = await getOwnedFile(req.user.userId, req.params.fileId)
  const key = { userId: file.userId, fileId: file.fileId }
  // Serialize per file: a double-click doesn't trigger two expensive generations.
  const result = await withLock(`summary:${file.fileId}`, async () => {
    if (!req.body?.forceRegenerate) {
      const { Item } = await dynamoDb.send(new GetCommand({ TableName: T_SUMMARIES, Key: key }))
      if (Item?.summary) return { cached: true, summary: Item }
    }
    const chunks = await getFileChunks(file)
    const summary = await generateDocumentSummary(chunks)
    const now = new Date().toISOString()
    const record = { ...key, summaryId: crypto.randomUUID(), fileName: file.originalName, subjectName: file.subjectName, summary, status: 'completed', createdAt: now, updatedAt: now }
    await dynamoDb.send(new PutCommand({ TableName: T_SUMMARIES, Item: record }))
    await dynamoDb.send(new UpdateCommand({ TableName: T_FILES, Key: key, UpdateExpression: 'SET hasSummary = :t', ExpressionAttributeValues: { ':t': true } }))
    return { cached: false, summary: record }
  })
  res.json({ success: true, ...result })
}

// GET /files/:fileId/quiz
export const getFileQuiz = async (req, res) => {
  const file = await getOwnedFile(req.user.userId, req.params.fileId)
  const { Item } = await dynamoDb.send(new GetCommand({ TableName: T_QUIZZES, Key: { userId: file.userId, fileId: file.fileId } }))
  res.json({ success: true, cached: Boolean(Item?.questions?.length), quiz: Item?.questions?.length ? Item : null })
}

// POST /files/:fileId/quiz  { forceRegenerate?, count? }
export const generateOrGetFileQuiz = async (req, res) => {
  const file = await getOwnedFile(req.user.userId, req.params.fileId)
  const key = { userId: file.userId, fileId: file.fileId }
  const result = await withLock(`quiz:${file.fileId}`, async () => {
    if (!req.body?.forceRegenerate) {
      const { Item } = await dynamoDb.send(new GetCommand({ TableName: T_QUIZZES, Key: key }))
      if (Item?.questions?.length) return { cached: true, quiz: Item }
    }
    const count = Math.min(Math.max(Number(req.body?.count) || 5, 3), 10)
    const questions = await generateDocumentQuiz(await getFileChunks(file), count)
    const now = new Date().toISOString()
    const record = { ...key, quizId: crypto.randomUUID(), fileName: file.originalName, subjectName: file.subjectName, questions, createdAt: now, updatedAt: now }
    await dynamoDb.send(new PutCommand({ TableName: T_QUIZZES, Item: record }))
    await dynamoDb.send(new UpdateCommand({ TableName: T_FILES, Key: key, UpdateExpression: 'SET hasQuiz = :t', ExpressionAttributeValues: { ':t': true } }))
    return { cached: false, quiz: record }
  })
  res.json({ success: true, ...result })
}

// POST /files/:fileId/quiz/score  { answers: number[] }
// The score is computed on the server from the stored answer key; the client can't inflate it.
export const saveQuizResult = async (req, res) => {
  const file = await getOwnedFile(req.user.userId, req.params.fileId)
  const { Item: quiz } = await dynamoDb.send(new GetCommand({ TableName: T_QUIZZES, Key: { userId: file.userId, fileId: file.fileId } }))
  if (!quiz?.questions?.length) throw new HttpError(404, 'No quiz exists for this file.')
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : null
  if (!answers || answers.length !== quiz.questions.length) throw new HttpError(400, `answers must be an array of ${quiz.questions.length} option indexes.`)

  const graded = quiz.questions.map((q, i) => {
    const chosen = Number.isInteger(answers[i]) ? answers[i] : null
    return { question: q.question, chosen, correct: q.answer, isCorrect: chosen === q.answer }
  })
  const score = graded.filter(g => g.isCorrect).length
  const now = new Date().toISOString()
  const scoreId = `${now}#${crypto.randomUUID()}`
  const record = {
    userId: file.userId, scoreId, quizId: quiz.quizId, fileId: file.fileId, fileName: file.originalName,
    subjectName: file.subjectName, score, total: graded.length, pct: Math.round((score / graded.length) * 100),
    answers: graded, wrongTopics: graded.filter(g => !g.isCorrect).map(g => g.question.slice(0, 120)),
    date: now.slice(0, 10), timestamp: now
  }
  await dynamoDb.send(new PutCommand({ TableName: T_SCORES, Item: record }))
  res.status(201).json({ success: true, score: record })
}
