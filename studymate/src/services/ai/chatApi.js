import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new chat session
 */
export async function createChat(userId) {
    const res = await axios.post(`${API_BASE}/chat/${userId}/new`)
    return res.data
}

/**
 * Get all chats for a user
 */
export async function getUserChats(userId) {
    const res = await axios.get(`${API_BASE}/chat/${userId}/list`)
    return res.data
}

/**
 * Get all messages for a specific chat
 */
export async function getChatMessages(chatId) {
    const res = await axios.get(`${API_BASE}/chat/${chatId}/messages`)
    return res.data
}

/**
 * Send a message and get AI response
 * @param {string} chatId 
 * @param {string} userId 
 * @param {string} content - User's message text
 * @param {string|null} pdfContext - Optional PDF text context
 */
export async function sendMessage(chatId, userId, content, pdfContext = null) {
    const res = await axios.post(`${API_BASE}/chat/${chatId}/send`, {
        userId,
        content,
        pdfContext
    })
    return res.data
}

/**
 * Rename a chat
 */
export async function renameChat(userId, chatId, title) {
    const res = await axios.put(`${API_BASE}/chat/${userId}/${chatId}/rename`, { title })
    return res.data
}

/**
 * Delete a chat and all its messages
 */
export async function deleteChat(userId, chatId) {
    const res = await axios.delete(`${API_BASE}/chat/${userId}/${chatId}`)
    return res.data
}

/**
 * Search chats by title
 */
export async function searchChats(userId, query) {
    const res = await axios.get(`${API_BASE}/chat/${userId}/search`, {
        params: { q: query }
    })
    return res.data
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all AI memory items for a user
 */
export async function getMemory(userId) {
    const res = await axios.get(`${API_BASE}/memory/${userId}`)
    return res.data
}

/**
 * Set or update a memory item
 */
export async function setMemoryItem(userId, key, value) {
    const res = await axios.post(`${API_BASE}/memory/${userId}`, { key, value })
    return res.data
}

/**
 * Delete a specific memory item
 */
export async function deleteMemoryItem(userId, key) {
    const res = await axios.delete(`${API_BASE}/memory/${userId}/${key}`)
    return res.data
}

/**
 * Clear all memory for a user
 */
export async function clearAllMemory(userId) {
    const res = await axios.delete(`${API_BASE}/memory/${userId}/clear`, {
        params: { all: 'true' }
    })
    return res.data
}
