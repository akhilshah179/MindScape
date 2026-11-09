// StudyMate AI chat + memory API. Identity comes from the auth token; the legacy
// `userId` parameters are accepted and ignored so existing callers keep working.
import { api, streamPost } from '../../lib/api'

export async function createChat(_userId, { title, fileId } = {}) {
  const { data } = await api.post('/chat', { title, fileId: fileId || undefined })
  return data
}

export async function getUserChats() {
  const { data } = await api.get('/chat')
  return data
}

/** Returns { chat, messages }. */
export async function getChat(chatId, { signal } = {}) {
  const { data } = await api.get(`/chat/${chatId}/messages`, { signal })
  return data
}

export async function getChatMessages(chatId) {
  return (await getChat(chatId)).messages
}

/**
 * Send a message. With onToken, the reply streams in; resolves with
 * { reply, title, fileId, fileName, userMessage, assistantMessage }.
 * `fileId`: undefined = keep the chat's document, null = detach, string = attach.
 */
export async function sendMessage(chatId, { content, fileId, onToken, signal }) {
  const body = { content, ...(fileId !== undefined ? { fileId } : {}) }
  if (onToken) return streamPost(`/chat/${chatId}/messages`, body, { onToken, signal })
  const { data } = await api.post(`/chat/${chatId}/messages`, body, { signal })
  return data
}

export async function renameChat(_userId, chatId, title) {
  const { data } = await api.patch(`/chat/${chatId}`, { title })
  return data
}

export async function pinChat(chatId, isPinned) {
  const { data } = await api.patch(`/chat/${chatId}`, { isPinned })
  return data
}

export async function deleteChat(_userId, chatId) {
  const { data } = await api.delete(`/chat/${chatId}`)
  return data
}

export async function searchChats(_userId, q) {
  const { data } = await api.get('/chat/search', { params: { q } })
  return data
}

// ── Memory ──
export async function getMemory() { return (await api.get('/memory')).data }
export async function setMemoryItem(_userId, key, value) { return (await api.post('/memory', { key, value })).data }
export async function deleteMemoryItem(_userId, key) { return (await api.delete(`/memory/${encodeURIComponent(key)}`)).data }
export async function clearAllMemory() { return (await api.delete('/memory')).data }
