import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new chat session
 */
export async function createChat(userId, { title, fileId, fileName } = {}) {
    const res = await axios.post(`${API_BASE}/chat/${userId}/new`, {
        title: title || 'New Chat',
        fileId: fileId || null,
        fileName: fileName || null
    }, {
        headers: { 'x-user-id': userId }
    })
    return res.data
}

/**
 * Get all chats for a user
 */
export async function getUserChats(userId) {
    const res = await axios.get(`${API_BASE}/chat/${userId}/list`, {
        headers: { 'x-user-id': userId }
    })
    return res.data
}

/**
 * Get all messages for a specific chat
 */
export async function getChatMessages(chatId, userId = null) {
    const headers = {}
    if (userId) headers['x-user-id'] = userId

    const res = await axios.get(`${API_BASE}/chat/${chatId}/messages`, { headers })
    return res.data
}

/**
 * Send a message and get AI response
 * @param {string} chatId 
 * @param {string} userId 
 * @param {string} content - User's message text
 * @param {string|null} pdfContext - Optional PDF text context
 * @param {string|null} fileId - Optional PDF file ID
 * @param {string|null} fileName - Optional PDF file Name
 */
export async function sendMessage(chatId, userId, content, pdfContext = null, fileId = null, fileName = null) {
    const res = await axios.post(`${API_BASE}/chat/${chatId}/send`, {
        userId,
        content,
        pdfContext,
        fileId,
        fileName
    }, {
        headers: { 'x-user-id': userId }
    })
    return res.data
}

/**
 * Rename a chat
 */
export async function renameChat(userId, chatId, title) {
    const res = await axios.put(`${API_BASE}/chat/${userId}/${chatId}/rename`, { title }, {
        headers: { 'x-user-id': userId }
    })
    return res.data
}

/**
 * Delete a chat and all its messages
 */
export async function deleteChat(userId, chatId) {
    const res = await axios.delete(`${API_BASE}/chat/${userId}/${chatId}`, {
        headers: { 'x-user-id': userId }
    })
    return res.data
}

/**
 * Search chats by title
 */
export async function searchChats(userId, query) {
    const res = await axios.get(`${API_BASE}/chat/${userId}/search`, {
        headers: { 'x-user-id': userId },
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
    const res = await axios.get(`${API_BASE}/memory/${userId}`, {
        headers: { 'x-user-id': userId }
    })
    return res.data
}

/**
 * Set or update a memory item
 */
export async function setMemoryItem(userId, key, value) {
    const res = await axios.post(`${API_BASE}/memory/${userId}`, { key, value }, {
        headers: { 'x-user-id': userId }
    })
    return res.data
}

/**
 * Delete a specific memory item
 */
export async function deleteMemoryItem(userId, key) {
    const res = await axios.delete(`${API_BASE}/memory/${userId}/${key}`, {
        headers: { 'x-user-id': userId }
    })
    return res.data
}

/**
 * Clear all memory for a user
 */
export async function clearAllMemory(userId) {
    const res = await axios.delete(`${API_BASE}/memory/${userId}/all`, {
        headers: { 'x-user-id': userId }
    })
    return res.data
}
