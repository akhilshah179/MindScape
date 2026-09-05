import axios from 'axios'
import { getAuthUser } from '../utils/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Get current authenticated userId
 */
async function getUserId() {
    try {
        const user = await getAuthUser()
        return user?.userId || null
    } catch {
        const stored = localStorage.getItem('studymate_user')
        if (stored) {
            try {
                return JSON.parse(stored)?.userId || null
            } catch {}
        }
        return null
    }
}

/**
 * Upload a PDF file for a given subject
 * @param {File} file 
 * @param {string} subjectName 
 * @param {function} onProgress - (progressPercent: number) => void
 */
export async function uploadFile(file, subjectName = 'General', onProgress = null) {
    const userId = await getUserId()
    if (!userId) {
        throw new Error('You must be logged in to upload files.')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('subjectName', subjectName)

    const response = await axios.post(`${API_BASE}/files/upload`, formData, {
        headers: {
            'x-user-id': userId
        },
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
                const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                onProgress(percent)
            }
        }
    })

    return response.data
}

/**
 * Get all files for a specific subject
 * @param {string} subjectName 
 */
export async function getFiles(subjectName) {
    const userId = await getUserId()
    if (!userId) return []

    const params = {}
    if (subjectName) params.subjectName = subjectName

    const response = await axios.get(`${API_BASE}/files`, {
        headers: { 'x-user-id': userId },
        params
    })

    return response.data?.files || []
}

/**
 * Get all files for current user across all subjects
 */
export async function getAllFiles() {
    const userId = await getUserId()
    if (!userId) return []

    const response = await axios.get(`${API_BASE}/files`, {
        headers: { 'x-user-id': userId }
    })

    return response.data?.files || []
}

/**
 * Get full download/stream URL for a file
 * @param {string} fileId 
 */
export async function getFileContentUrl(fileId) {
    const userId = await getUserId()
    return `${API_BASE}/files/${fileId}/content?userId=${encodeURIComponent(userId || '')}`
}

/**
 * Fetch raw PDF blob (used for text extraction and local blob URLs)
 * @param {string} fileId 
 */
export async function fetchFileBlob(fileId) {
    const userId = await getUserId()
    const response = await axios.get(`${API_BASE}/files/${fileId}/content`, {
        headers: { 'x-user-id': userId },
        responseType: 'blob'
    })
    return response.data
}

/**
 * Delete a file by fileId
 * @param {string} fileId 
 */
export async function deleteFile(fileId) {
    const userId = await getUserId()
    if (!userId) {
        throw new Error('Unauthorized')
    }

    const response = await axios.delete(`${API_BASE}/files/${fileId}`, {
        headers: { 'x-user-id': userId }
    })

    return response.data
}

/**
 * Fetch existing saved summary for a file
 * @param {string} fileId 
 */
export async function getFileSummary(fileId) {
    const userId = await getUserId()
    if (!userId) return null

    const response = await axios.get(`${API_BASE}/files/${fileId}/summary`, {
        headers: { 'x-user-id': userId }
    })

    return response.data?.summary || null
}

/**
 * Generate (or fetch existing) summary for a file via backend AI service
 * @param {string} fileId 
 * @param {string} text - Extracted document text
 * @param {boolean} forceRegenerate 
 */
export async function generateFileSummary(fileId, text, forceRegenerate = false) {
    const userId = await getUserId()
    if (!userId) {
        throw new Error('Unauthorized: Please log in to generate summaries.')
    }

    const response = await axios.post(`${API_BASE}/files/${fileId}/summary`, {
        text,
        forceRegenerate
    }, {
        headers: { 'x-user-id': userId }
    })

    return response.data
}

/**
 * Fetch existing saved quiz for a file
 * @param {string} fileId 
 */
export async function getFileQuiz(fileId) {
    const userId = await getUserId()
    if (!userId) return null

    const response = await axios.get(`${API_BASE}/files/${fileId}/quiz`, {
        headers: { 'x-user-id': userId }
    })

    return response.data?.quiz || null
}

/**
 * Generate (or fetch existing) quiz for a file via backend AI service
 * @param {string} fileId 
 * @param {string} text - Extracted document text
 * @param {boolean} forceRegenerate 
 */
export async function generateFileQuiz(fileId, text, forceRegenerate = false) {
    const userId = await getUserId()
    if (!userId) {
        throw new Error('Unauthorized: Please log in to generate quizzes.')
    }

    const response = await axios.post(`${API_BASE}/files/${fileId}/quiz`, {
        text,
        forceRegenerate
    }, {
        headers: { 'x-user-id': userId }
    })

    return response.data
}

/**
 * Save quiz score permanently to backend database
 * @param {string} fileId 
 * @param {object} payload - { score, total, pct, answers, wrongTopics, subjectName, fileName }
 */
export async function saveFileQuizScore(fileId, payload) {
    const userId = await getUserId()
    if (!userId) return null

    const response = await axios.post(`${API_BASE}/files/${fileId}/quiz/score`, payload, {
        headers: { 'x-user-id': userId }
    })

    return response.data
}

/**
 * Fetch all quiz scores for a user
 * @param {string} userId 
 */
export async function getUserQuizScores(userId) {
    const uid = userId || await getUserId()
    if (!uid) return []

    try {
        const response = await axios.get(`${API_BASE}/users/${uid}/scores`, {
            headers: { 'x-user-id': uid }
        })
        return response.data || []
    } catch {
        return []
    }
}

