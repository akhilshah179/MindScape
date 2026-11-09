// Server-side PDF text extraction, chunking and retrieval.
// The backend extracts text once at upload and stores it next to the PDF, so summaries,
// quizzes and PDF chat always use the right document without the browser re-sending text.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const CHUNK_CHARS = 1500
const CHUNK_OVERLAP = 200

/** Validate the PDF signature (magic bytes) rather than trusting the browser's MIME type. */
export const isPdfBuffer = (buf) => buf?.length > 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-'

/** Extract text per page. Throws a friendly error for encrypted / corrupt PDFs. */
export async function extractPdfText(buffer, { maxPages = 500 } = {}) {
  let doc
  try {
    doc = await getDocument({
      data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: false, disableFontFace: true, verbosity: 0
    }).promise
  } catch (err) {
    if (err?.name === 'PasswordException') throw Object.assign(new Error('This PDF is password-protected. Please upload an unlocked copy.'), { status: 400 })
    throw Object.assign(new Error('This file could not be read as a PDF. It may be corrupt.'), { status: 400 })
  }
  const pages = []
  const n = Math.min(doc.numPages, maxPages)
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) {
      text += item.str
      text += item.hasEOL ? '\n' : ' '
    }
    pages.push(text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim())
    page.cleanup()
  }
  const numPages = doc.numPages
  await doc.destroy()
  return { pages, numPages }
}

/** Split page texts into overlapping chunks tagged with their page number. */
export function chunkPages(pages) {
  const chunks = []
  pages.forEach((text, idx) => {
    if (!text) return
    let start = 0
    while (start < text.length) {
      let end = Math.min(text.length, start + CHUNK_CHARS)
      // prefer to break on a sentence boundary
      if (end < text.length) {
        const cut = text.lastIndexOf('. ', end)
        if (cut > start + CHUNK_CHARS * 0.6) end = cut + 1
      }
      chunks.push({ id: chunks.length, page: idx + 1, text: text.slice(start, end).trim() })
      if (end >= text.length) break
      start = end - CHUNK_OVERLAP
    }
  })
  return chunks
}

const STOP = new Set('a an the and or of to in on for with is are was were be been by as at it this that from what which who how why when where does do did can could should would will about into than then there their its explain tell me please give list'.split(' '))
const terms = (s) => (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length > 1 && !STOP.has(t))

/**
 * BM25 retrieval over chunks. Returns the most relevant chunks for a question,
 * within a character budget, ordered by their position in the document.
 */
export function retrieveChunks(chunks, query, { budget = 6000, k1 = 1.4, b = 0.75 } = {}) {
  if (!chunks?.length) return []
  const q = [...new Set(terms(query))]
  const docs = chunks.map(c => terms(c.text))
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / docs.length || 1
  const df = new Map()
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1)
  const N = docs.length
  const scored = docs.map((d, i) => {
    if (!q.length) return { i, score: 0 }
    const tf = new Map()
    for (const t of d) tf.set(t, (tf.get(t) || 0) + 1)
    let score = 0
    for (const t of q) {
      const f = tf.get(t)
      if (!f) continue
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5))
      score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.length / avgLen))
    }
    return { i, score }
  })
  // No lexical match (e.g. "summarize this"): fall back to the opening of the document.
  const ranked = scored.some(s => s.score > 0) ? scored.sort((a, b) => b.score - a.score) : scored
  const picked = []
  let used = 0
  for (const { i, score } of ranked) {
    if (q.length && score <= 0 && picked.length) break
    const c = chunks[i]
    if (used + c.text.length > budget) { if (picked.length) continue; }
    picked.push(c)
    used += c.text.length
    if (used >= budget) break
  }
  return picked.sort((a, b) => a.id - b.id)
}

/** Evenly sample chunks across the whole document (for quizzes that should cover everything). */
export function sampleChunks(chunks, budget = 9000) {
  if (!chunks?.length) return []
  const total = chunks.reduce((s, c) => s + c.text.length, 0)
  if (total <= budget) return chunks
  const n = Math.max(1, Math.floor(budget / CHUNK_CHARS))
  const step = chunks.length / n
  return Array.from({ length: n }, (_, i) => chunks[Math.floor(i * step)])
}

export const formatChunks = (chunks) => chunks.map(c => `[Page ${c.page}]\n${c.text}`).join('\n\n---\n\n')
