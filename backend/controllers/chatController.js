import crypto from 'crypto'
import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDb from '../config/dynamoDb.js'
import { callGroq, streamGroq, parseJsonLoose } from '../services/aiService.js'
import { retrieveChunks, formatChunks } from '../services/documentService.js'
import { getOwnedFile, getFileChunks } from './fileController.js'
import { listMemory, upsertMemory } from './memoryController.js'
import { HttpError, requireString } from '../middleware/http.js'

const T_CHATS = 'studymate_chats'
const T_MSGS = 'studymate_chat_messages'
const HISTORY_CHAR_BUDGET = 12000
const DOC_CHAR_BUDGET = 6000
const MAX_MESSAGE = 8000

const newMessageId = (ts) => `${ts}#${crypto.randomUUID()}`

function fastTitle(text) {
  const line = text.trim().replace(/^[^a-zA-Z0-9]+/, '').split('\n')[0].trim()
  const words = line.split(/\s+/).slice(0, 7).join(' ')
  const t = words.length > 48 ? words.slice(0, 48).trimEnd() + '…' : words
  return t ? t[0].toUpperCase() + t.slice(1) : 'New Chat'
}

async function getOwnedChat(userId, chatId) {
  const { Item } = await dynamoDb.send(new GetCommand({ TableName: T_CHATS, Key: { userId, chatId: String(chatId) } }))
  if (!Item) throw new HttpError(404, 'Chat not found.')
  return Item
}

async function getMessages(chatId) {
  const { Items = [] } = await dynamoDb.send(new QueryCommand({
    TableName: T_MSGS, KeyConditionExpression: 'chatId = :c', ExpressionAttributeValues: { ':c': chatId }
  }))
  return Items.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || '') || a.messageId.localeCompare(b.messageId))
}

/** Most recent messages that fit the budget, oldest first. */
function trimHistory(messages, budget = HISTORY_CHAR_BUDGET) {
  const out = []
  let used = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (used + m.content.length > budget && out.length) break
    out.unshift({ role: m.role, content: m.content.slice(0, budget) })
    used += m.content.length
  }
  return out
}

function systemPrompt({ memory, doc }) {
  let p = `You are StudyMate AI, a friendly and precise learning assistant for students.
Formatting: Markdown with **bold** key terms, bullet/numbered lists, headings when helpful, fenced code blocks with language tags.
Be accurate. If you are unsure, say so instead of guessing.`
  if (memory.length) {
    p += `\n\nWHAT YOU KNOW ABOUT THIS STUDENT (use it to personalise, don't recite it):\n` +
      memory.slice(0, 25).map(m => `- ${m.memoryKey.replace(/_/g, ' ')}: ${m.value}`).join('\n')
  }
  if (doc) {
    p += `\n\nThe student is asking about the document "${doc.name}". Relevant excerpts are below.
Answer from these excerpts. After each fact taken from the document, cite its page in the form (p. N) using the [Page N] markers. If the excerpts don't contain the answer, say that the document doesn't cover it, then optionally add general knowledge clearly labelled as such.
${doc.excerpts ? `\nDOCUMENT EXCERPTS:\n${doc.excerpts}` : '\n(This document has no extractable text — it is likely scanned images, so you cannot see its contents. Tell the student this.)'}`
  }
  return p
}

const MEMORY_CUE = /\b(i am|i'm|im|my|i study|i prefer|i like|i want|i need|remember|goal|exam|semester|major|weak|struggl)/i

/** Learn durable facts about the user. Runs after the reply; failures are logged, not hidden. */
async function extractMemory(userId, userText, reply) {
  if (!MEMORY_CUE.test(userText)) return
  try {
    const out = await callGroq({
      messages: [
        {
          role: 'system',
          content: `Extract durable facts about the STUDENT (not the topic) worth remembering for future tutoring: name, course/major, level, goals, exam dates, weak/strong topics, preferences.
Ignore one-off questions. Respond ONLY with JSON: {"facts":[{"key":"snake_case_key","value":"short value"}]} (empty list if none).`
        },
        { role: 'user', content: `Student: ${userText.slice(0, 2000)}\nAssistant: ${reply.slice(0, 800)}` }
      ],
      temperature: 0.1, max_tokens: 300
    })
    const facts = parseJsonLoose(out)?.facts
    if (!Array.isArray(facts)) return
    for (const f of facts.slice(0, 5)) {
      if (typeof f?.key === 'string' && typeof f?.value === 'string' && f.value.trim()) {
        await upsertMemory(userId, f.key, f.value, 'auto')
      }
    }
  } catch (err) {
    console.warn('[chat] memory extraction failed:', err.message)
  }
}

async function refineTitle(userId, chatId, firstMessage) {
  try {
    const title = (await callGroq({
      messages: [
        { role: 'system', content: 'Write a 3-6 word title for a chat that starts with this message. Respond with the title only, no quotes.' },
        { role: 'user', content: firstMessage.slice(0, 1000) }
      ],
      temperature: 0.3, max_tokens: 30
    })).replace(/^["'#\s]+|["'.\s]+$/g, '').slice(0, 60)
    if (!title) return
    // Only replace the auto title; never overwrite a title the user renamed meanwhile.
    await dynamoDb.send(new UpdateCommand({
      TableName: T_CHATS, Key: { userId, chatId },
      UpdateExpression: 'SET title = :t', ConditionExpression: 'titleSource = :auto',
      ExpressionAttributeValues: { ':t': title, ':auto': 'auto' }
    }))
  } catch (err) {
    if (err.name !== 'ConditionalCheckFailedException') console.warn('[chat] title refinement failed:', err.message)
  }
}

const chatSummary = (c) => ({
  chatId: c.chatId, title: c.title, fileId: c.fileId || null, fileName: c.fileName || null,
  createdAt: c.createdAt, updatedAt: c.updatedAt, messageCount: c.messageCount || 0, isPinned: Boolean(c.isPinned)
})

// POST /chat  { title?, fileId? }
export const createChat = async (req, res) => {
  const userId = req.user.userId
  let file = null
  if (req.body?.fileId) file = await getOwnedFile(userId, req.body.fileId)
  const now = new Date().toISOString()
  const chat = {
    userId, chatId: crypto.randomUUID(),
    title: typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim().slice(0, 100) : 'New Chat',
    titleSource: 'default', fileId: file?.fileId || null, fileName: file?.originalName || null,
    createdAt: now, updatedAt: now, messageCount: 0, isPinned: false
  }
  await dynamoDb.send(new PutCommand({ TableName: T_CHATS, Item: chat }))
  res.status(201).json(chatSummary(chat))
}

// GET /chat
export const getUserChats = async (req, res) => {
  const { Items = [] } = await dynamoDb.send(new QueryCommand({
    TableName: T_CHATS, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': req.user.userId }
  }))
  Items.sort((a, b) => (Number(b.isPinned) - Number(a.isPinned)) || (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  res.json(Items.map(chatSummary))
}

// GET /chat/search?q=
export const searchChats = async (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim()
  if (!q) return res.json([])
  const { Items = [] } = await dynamoDb.send(new QueryCommand({
    TableName: T_CHATS, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': req.user.userId }
  }))
  res.json(Items.filter(c => (c.title || '').toLowerCase().includes(q) || (c.fileName || '').toLowerCase().includes(q))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(chatSummary))
}

// GET /chat/:chatId/messages
export const getChatMessages = async (req, res) => {
  const chat = await getOwnedChat(req.user.userId, req.params.chatId)
  const messages = await getMessages(chat.chatId)
  res.json({
    chat: chatSummary(chat),
    messages: messages.map(m => ({ messageId: m.messageId, role: m.role, content: m.content, timestamp: m.timestamp, metadata: m.metadata || {} }))
  })
}

// POST /chat/:chatId/messages  { content, fileId? }   (Accept: text/event-stream for streaming)
export const sendMessage = async (req, res) => {
  const userId = req.user.userId
  const content = requireString(req.body?.content, 'content', { max: MAX_MESSAGE })
  const chat = await getOwnedChat(userId, req.params.chatId)

  // Attach / switch document if requested (must be the user's own file)
  let fileId = chat.fileId, fileName = chat.fileName
  if (req.body?.fileId !== undefined && req.body.fileId !== chat.fileId) {
    if (req.body.fileId === null) { fileId = null; fileName = null }
    else { const f = await getOwnedFile(userId, req.body.fileId); fileId = f.fileId; fileName = f.originalName }
  }

  const [history, memory, doc] = await Promise.all([
    getMessages(chat.chatId),
    listMemory(userId),
    (async () => {
      if (!fileId) return null
      const file = await getOwnedFile(userId, fileId).catch(() => null)
      if (!file) return null
      const chunks = await getFileChunks(file)
      // Use the question plus the previous user turn so follow-ups ("explain that more") still retrieve well.
      return { name: file.originalName, excerpts: formatChunks(retrieveChunks(chunks, content, { budget: DOC_CHAR_BUDGET })) }
    })()
  ])

  const messages = [
    { role: 'system', content: systemPrompt({ memory, doc }) },
    ...trimHistory(history),
    { role: 'user', content }
  ]

  const streaming = (req.headers.accept || '').includes('text/event-stream')
  const abort = new AbortController()
  res.on('close', () => { if (!res.writableFinished) abort.abort() })

  if (streaming) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
  }
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  let reply
  try {
    reply = streaming
      ? await streamGroq({ messages, temperature: 0.6, max_tokens: 2048, signal: abort.signal, onToken: (t) => send('token', { t }) })
      : await callGroq({ messages, temperature: 0.6, max_tokens: 2048, signal: abort.signal })
  } catch (err) {
    if (abort.signal.aborted) return res.end()
    if (!streaming) throw err
    send('error', { error: err.status && err.status < 500 ? err.message : (err.message || 'AI request failed.') })
    return res.end()
  }

  // Persist the exchange only after the AI succeeded (no dangling user turns on failure).
  const userTs = new Date().toISOString()
  const replyTs = new Date(Date.now() + 1).toISOString()
  const userMsg = { chatId: chat.chatId, messageId: newMessageId(userTs), userId, role: 'user', content, timestamp: userTs, metadata: fileId ? { fileId } : {} }
  const aiMsg = { chatId: chat.chatId, messageId: newMessageId(replyTs), userId, role: 'assistant', content: reply, timestamp: replyTs, metadata: doc ? { fileId, usedDocument: true } : {} }
  const isFirst = (chat.messageCount || 0) === 0 && chat.titleSource !== 'user'
  const title = isFirst ? fastTitle(content) : chat.title

  await dynamoDb.send(new BatchWriteCommand({ RequestItems: { [T_MSGS]: [{ PutRequest: { Item: userMsg } }, { PutRequest: { Item: aiMsg } }] } }))
  await dynamoDb.send(new UpdateCommand({
    TableName: T_CHATS, Key: { userId, chatId: chat.chatId },
    UpdateExpression: `SET updatedAt = :now, messageCount = if_not_exists(messageCount, :z) + :two, fileId = :f, fileName = :fn${isFirst ? ', title = :t, titleSource = :auto' : ''}`,
    ExpressionAttributeValues: { ':now': replyTs, ':z': 0, ':two': 2, ':f': fileId || null, ':fn': fileName || null, ...(isFirst ? { ':t': title, ':auto': 'auto' } : {}) }
  }))

  const payload = {
    reply, title, fileId: fileId || null, fileName: fileName || null,
    userMessage: { messageId: userMsg.messageId, role: 'user', content, timestamp: userTs },
    assistantMessage: { messageId: aiMsg.messageId, role: 'assistant', content: reply, timestamp: replyTs, metadata: aiMsg.metadata }
  }
  if (streaming) { send('done', payload); res.end() } else res.json(payload)

  // Background work after responding
  if (isFirst) refineTitle(userId, chat.chatId, content)
  extractMemory(userId, content, reply)
}

// PATCH /chat/:chatId  { title?, isPinned? }
export const updateChat = async (req, res) => {
  const userId = req.user.userId
  const chat = await getOwnedChat(userId, req.params.chatId)
  const sets = ['updatedAt = :now']
  const vals = { ':now': new Date().toISOString() }
  if (req.body?.title !== undefined) {
    sets.push('title = :t', 'titleSource = :user')
    vals[':t'] = requireString(req.body.title, 'title', { max: 100 })
    vals[':user'] = 'user'
  }
  if (req.body?.isPinned !== undefined) { sets.push('isPinned = :p'); vals[':p'] = Boolean(req.body.isPinned) }
  const { Attributes } = await dynamoDb.send(new UpdateCommand({
    TableName: T_CHATS, Key: { userId, chatId: chat.chatId },
    UpdateExpression: 'SET ' + sets.join(', '), ExpressionAttributeValues: vals, ReturnValues: 'ALL_NEW'
  }))
  res.json(chatSummary(Attributes))
}

// DELETE /chat/:chatId
export const deleteChat = async (req, res) => {
  const userId = req.user.userId
  const chat = await getOwnedChat(userId, req.params.chatId)
  const messages = await getMessages(chat.chatId)
  for (let i = 0; i < messages.length; i += 25) {
    await dynamoDb.send(new BatchWriteCommand({
      RequestItems: { [T_MSGS]: messages.slice(i, i + 25).map(m => ({ DeleteRequest: { Key: { chatId: m.chatId, messageId: m.messageId } } })) }
    }))
  }
  await dynamoDb.send(new DeleteCommand({ TableName: T_CHATS, Key: { userId, chatId: chat.chatId } }))
  res.json({ success: true, chatId: chat.chatId })
}
