// Groq LLM access. All credentials stay on the backend.
import '../config/env.js'
import { HttpError } from '../middleware/http.js'
import { formatChunks, sampleChunks } from './documentService.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
// Measured: gpt-oss-20b w/ reasoning_effort=low ≈ 0.6s for a short answer; others are fallbacks.
const MODELS = (process.env.GROQ_MODELS || 'openai/gpt-oss-20b,openai/gpt-oss-120b,qwen/qwen3.8-27b')
  .split(',').map(s => s.trim()).filter(Boolean)
const REQUEST_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 45000

const delay = (ms) => new Promise(r => setTimeout(r, ms))
const TRANSIENT = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT'])

function modelOptions(model) {
  if (model.startsWith('openai/gpt-oss')) return { reasoning_effort: process.env.GROQ_REASONING_EFFORT || 'low', include_reasoning: false }
  if (model.startsWith('qwen/')) return { reasoning_format: 'hidden' }
  return {}
}

const stripThinking = (s) => (s || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()

function apiKey() {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new HttpError(503, 'AI service is not configured (GROQ_API_KEY missing on the server).')
  return key
}

async function groqFetch(model, body, signal) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new Error('timeout')), REQUEST_TIMEOUT_MS)
  const onAbort = () => ctrl.abort(signal.reason)
  signal?.addEventListener('abort', onAbort)
  try {
    return await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, ...modelOptions(model), ...body }),
      signal: ctrl.signal
    })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * Try models in order. Same-model retry on transient network errors, next model on
 * 429 / 5xx / unknown model. Client errors (400, 401) fail fast with a clear message.
 */
async function withFallback(body, signal, handle) {
  let lastErr
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal?.aborted) throw new HttpError(499, 'Request cancelled.')
      let res
      try {
        res = await groqFetch(model, body, signal)
      } catch (err) {
        lastErr = err
        const code = err.cause?.code || err.code
        if (signal?.aborted) throw new HttpError(499, 'Request cancelled.')
        if (TRANSIENT.has(code) || err.name === 'AbortError' || err.message === 'timeout') {
          console.warn(`[ai] ${model} network error (${code || err.message}), attempt ${attempt + 1}`)
          await delay(400 * (attempt + 1))
          continue
        }
        throw err
      }
      if (res.ok) return handle(res, model)
      const detail = await res.json().catch(() => ({}))
      const msg = detail?.error?.message || res.statusText
      lastErr = new Error(`${res.status} ${msg}`)
      if (res.status === 401 || res.status === 403) throw new HttpError(503, 'AI service credentials were rejected. Check GROQ_API_KEY on the server.')
      if (res.status === 400 && /context|too long|maximum.*tokens/i.test(msg)) throw new HttpError(413, 'The request was too large for the AI model. Try a shorter message.')
      if (res.status === 400 && !/model/i.test(msg)) throw new HttpError(502, `AI request rejected: ${msg}`)
      console.warn(`[ai] ${model} -> ${res.status} ${msg}; trying next model`)
      break
    }
  }
  console.error('[ai] all models failed:', lastErr?.message)
  throw new HttpError(503, 'The AI service is temporarily unavailable. Please try again in a moment.')
}

/** Non-streaming completion. Returns the assistant text. */
export async function callGroq({ messages, temperature = 0.5, max_tokens = 1536, signal }) {
  return withFallback({ messages, temperature, max_tokens }, signal, async (res) => {
    const data = await res.json()
    const content = stripThinking(data?.choices?.[0]?.message?.content)
    if (!content) throw new HttpError(502, 'The AI returned an empty response. Please try again.')
    return content
  })
}

/**
 * Streaming completion: calls onToken(delta) as text arrives and resolves with the full text.
 * Model fallback is only possible before the first token is received.
 */
export async function streamGroq({ messages, temperature = 0.5, max_tokens = 1536, signal, onToken }) {
  return withFallback({ messages, temperature, max_tokens, stream: true }, signal, async (res) => {
    const decoder = new TextDecoder()
    let buf = '', full = '', inThink = false
    for await (const chunk of res.body) {
      buf += decoder.decode(chunk, { stream: true })
      let nl
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') continue
        let delta
        try { delta = JSON.parse(payload).choices?.[0]?.delta?.content } catch { continue }
        if (!delta) continue
        // Drop any inline <think> sections some models emit
        if (delta.includes('<think>')) inThink = true
        if (inThink) { if (delta.includes('</think>')) { inThink = false; delta = delta.split('</think>').pop() } else continue }
        full += delta
        onToken?.(delta)
      }
    }
    if (!full.trim()) throw new HttpError(502, 'The AI returned an empty response. Please try again.')
    return full.trim()
  })
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx) }
  }))
  return out
}

const SUMMARY_FORMAT = `Use Markdown with these sections where the material supports them:
## Overview
## Core Concepts
## Key Definitions
## Methods, Formulas & Examples
## Key Takeaways
Use **bold** for key terms. Base everything STRICTLY on the provided text; do not add outside facts.`

/** Summarise a document from its chunks. Long documents use parallel map-reduce. */
export async function generateDocumentSummary(chunks) {
  const total = chunks.reduce((s, c) => s + c.text.length, 0)
  if (total < 30) throw new HttpError(422, 'This PDF has no extractable text (it may be scanned images). OCR is required to summarise it.')

  if (total <= 12000) {
    return callGroq({
      messages: [
        { role: 'system', content: `You are an expert academic tutor writing a study summary.\n${SUMMARY_FORMAT}` },
        { role: 'user', content: `Summarise this document:\n\n${formatChunks(chunks)}` }
      ],
      temperature: 0.3, max_tokens: 2048
    })
  }

  // Map: group chunks into ~10k-char sections and extract notes in parallel (bounded).
  const groups = []
  let cur = [], size = 0
  for (const c of chunks) {
    if (size + c.text.length > 10000 && cur.length) { groups.push(cur); cur = []; size = 0 }
    cur.push(c); size += c.text.length
  }
  if (cur.length) groups.push(cur)
  const capped = groups.length > 12 ? sampleChunks(groups.map((g, i) => ({ id: i, text: formatChunks(g) })), 12 * 10000) : groups.map((g, i) => ({ id: i, text: formatChunks(g) }))

  const notes = await mapLimit(capped, 3, (g, i) => callGroq({
    messages: [
      { role: 'system', content: 'Extract dense, factual bullet-point notes: key concepts, definitions, formulas, examples. No preamble.' },
      { role: 'user', content: `Section ${i + 1} of ${capped.length}:\n\n${g.text}` }
    ],
    temperature: 0.2, max_tokens: 900
  }))

  return callGroq({
    messages: [
      { role: 'system', content: `You are an expert academic tutor. Merge section notes into one cohesive study summary without repetition.\n${SUMMARY_FORMAT}` },
      { role: 'user', content: notes.map((n, i) => `### Section ${i + 1}\n${n}`).join('\n\n') }
    ],
    temperature: 0.3, max_tokens: 2500
  })
}

function parseJsonLoose(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return JSON.parse(cleaned) } catch { /* fall through */ }
  const m = cleaned.match(/[[{][\s\S]*[\]}]/)
  if (m) { try { return JSON.parse(m[0]) } catch { /* ignore */ } }
  return null
}

/**
 * Validate a model-produced question. Rejects (returns null) rather than guessing:
 * a question whose correct answer can't be determined must never be shown.
 */
export function normalizeQuestion(q) {
  if (!q || typeof q !== 'object') return null
  const question = String(q.question || q.q || '').trim()
  const options = Array.isArray(q.options) ? q.options.map(o => String(o ?? '').replace(/^[A-D][).:]\s+/, '').trim()) : []
  if (!question || options.length !== 4 || options.some(o => !o)) return null
  if (new Set(options.map(o => o.toLowerCase())).size !== 4) return null
  let answer = -1
  const a = q.answer ?? q.ans ?? q.correct
  if (Number.isInteger(a) && a >= 0 && a < 4) answer = a
  else if (typeof a === 'string') {
    const letter = /^[A-D]$/i.test(a.trim()) ? a.trim().toUpperCase().charCodeAt(0) - 65 : -1
    answer = letter >= 0 ? letter : options.findIndex(o => o.toLowerCase() === a.trim().toLowerCase())
  }
  if (answer < 0) return null
  const explanation = String(q.explanation || '').trim()
  return { question, options, answer, explanation: explanation || `The correct answer is "${options[answer]}".` }
}

/** Generate validated MCQs covering the whole document. */
export async function generateDocumentQuiz(chunks, count = 5) {
  const total = chunks.reduce((s, c) => s + c.text.length, 0)
  if (total < 30) throw new HttpError(422, 'This PDF has no extractable text (it may be scanned images), so a quiz cannot be generated.')
  const material = formatChunks(sampleChunks(chunks, 9000))
  const system = `You are an expert examiner. Write exactly ${count} multiple-choice questions that test understanding of the material.
Rules:
- Every question must be answerable from the material alone.
- Exactly 4 distinct options; exactly one is correct; distractors must be plausible.
- "answer" is the zero-based index (0-3) of the correct option.
- "explanation": one sentence citing why the answer is correct.
Return ONLY JSON: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}`

  let valid = []
  for (let attempt = 0; attempt < 2 && valid.length < Math.min(3, count); attempt++) {
    const reply = await callGroq({
      messages: [{ role: 'system', content: system }, { role: 'user', content: material }],
      temperature: attempt === 0 ? 0.3 : 0.5, max_tokens: 2500
    })
    const parsed = parseJsonLoose(reply)
    const list = Array.isArray(parsed) ? parsed : parsed?.questions
    valid = (Array.isArray(list) ? list : []).map(normalizeQuestion).filter(Boolean).slice(0, count)
  }
  if (valid.length < Math.min(3, count)) throw new HttpError(502, 'The AI could not produce a valid quiz for this document. Please try again.')
  return valid
}

export { parseJsonLoose }
