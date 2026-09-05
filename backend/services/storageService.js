import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads')

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_ROOT)) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true })
}

/**
 * Sanitize filename to avoid path traversal or problematic characters
 */
function sanitizeFileName(fileName) {
    return (fileName || '').replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Save file to persistent storage
 */
export async function saveFile({ fileBuffer, userId, subjectName, originalName, mimeType }) {
    const fileId = crypto.randomUUID()
    const sanitizedUser = sanitizeFileName(userId || 'default_user')
    const sanitizedSubject = sanitizeFileName(subjectName || 'General')
    const sanitizedOriginal = sanitizeFileName(originalName || 'document.pdf')
    const storedFileName = `${fileId}_${sanitizedOriginal}`

    const userDir = path.join(UPLOADS_ROOT, sanitizedUser, sanitizedSubject)
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true })
    }

    const targetPath = path.join(userDir, storedFileName)
    await fs.promises.writeFile(targetPath, fileBuffer)

    return {
        fileId,
        storedPath: targetPath,
        storedName: storedFileName,
        storageType: 'local',
        size: fileBuffer.length
    }
}

/**
 * Get absolute file path on disk
 */
export function getStoredFilePath(fileMetadata) {
    if (!fileMetadata) return null
    if (fileMetadata.storedPath && fs.existsSync(fileMetadata.storedPath)) {
        return fileMetadata.storedPath
    }
    const sanitizedUser = sanitizeFileName(fileMetadata.userId || 'default_user')
    const sanitizedSubject = sanitizeFileName(fileMetadata.subjectName || 'General')
    const candidatePath = path.join(UPLOADS_ROOT, sanitizedUser, sanitizedSubject, fileMetadata.storedName)
    if (fs.existsSync(candidatePath)) {
        return candidatePath
    }
    return null
}

/**
 * Create a read stream for a stored file
 */
export function getFileStream(fileMetadata) {
    const fullPath = getStoredFilePath(fileMetadata)
    if (!fullPath || !fs.existsSync(fullPath)) {
        throw new Error('File not found on storage system')
    }
    return fs.createReadStream(fullPath)
}

/**
 * Delete a stored file from storage
 */
export async function deleteStoredFile(fileMetadata) {
    try {
        const fullPath = getStoredFilePath(fileMetadata)
        if (fullPath && fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath)
        }
        return true
    } catch (err) {
        console.error('Error deleting physical file:', err)
        return false
    }
}
