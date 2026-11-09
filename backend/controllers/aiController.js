import { callGroq } from '../services/aiService.js'
import { HttpError } from '../middleware/http.js'

/**
 * Generic, stateless assistant turn (used by small widgets). The server owns the system prompt;
 * clients can only send user/assistant turns, so this can't be used as an open LLM proxy.
 */
export const handleChat = async (req, res) => {
  const { messages } = req.body || {}
  if (!Array.isArray(messages) || !messages.length) throw new HttpError(400, 'messages must be a non-empty array.')
  const turns = messages
    .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }))
  if (!turns.length || turns[turns.length - 1].role !== 'user') throw new HttpError(400, 'The last message must be from the user.')

  const reply = await callGroq({
    messages: [
      { role: 'system', content: 'You are StudyMate AI, a concise and accurate study assistant. Use Markdown with bullet points and **bold** key terms.' },
      ...turns
    ],
    temperature: 0.6,
    max_tokens: 1536
  })
  res.json({ reply })
}
