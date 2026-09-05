import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"
import { saveFile, getStoredFilePath, getFileStream, deleteStoredFile } from '../services/storageService.js'
import { generateDocumentSummary, generateDocumentQuiz } from '../services/aiService.js'
import crypto from 'crypto'

const TABLE_FILES = 'studymate_files'
const TABLE_SUMMARIES = 'studymate_summaries'
const TABLE_QUIZZES = 'studymate_quizzes'
const TABLE_SCORES = 'studymate_scores'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

/**
 * Helper to get authenticated userId from request
 */
function getRequestUserId(req) {
    return req.headers['x-user-id'] || req.body?.userId || req.query?.userId || null
}

/**
 * Upload a PDF file
 */
export const uploadFile = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file was uploaded. Please select a PDF file.' })
        }

        const { originalname, mimetype, buffer, size } = req.file
        const isPdfMime = mimetype === 'application/pdf'
        const isPdfExt = originalname.toLowerCase().endsWith('.pdf')

        if (!isPdfMime && !isPdfExt) {
            return res.status(400).json({ error: 'Invalid file type. Only PDF documents (.pdf) are allowed.' })
        }

        if (size > MAX_FILE_SIZE) {
            return res.status(400).json({ error: `File is too large. Maximum allowed size is 25MB (Selected file is ${(size / (1024 * 1024)).toFixed(2)}MB).` })
        }

        const subjectName = req.body.subjectName || 'General'

        // 1. Save file to storage
        const storageResult = await saveFile({
            fileBuffer: buffer,
            userId,
            subjectName,
            originalName: originalname,
            mimeType: 'application/pdf'
        })

        // 2. Persist metadata to database
        const fileRecord = {
            fileId: storageResult.fileId,
            userId,
            subjectName,
            originalName: originalname,
            storedName: storageResult.storedName,
            storedPath: storageResult.storedPath,
            mimeType: 'application/pdf',
            size,
            storageType: storageResult.storageType,
            uploadedAt: new Date().toISOString(),
            status: 'ready'
        }

        await dynamoDb.send(new PutCommand({
            TableName: TABLE_FILES,
            Item: fileRecord
        }))

        res.status(201).json({
            success: true,
            message: 'PDF uploaded successfully.',
            file: {
                fileId: fileRecord.fileId,
                userId: fileRecord.userId,
                subjectName: fileRecord.subjectName,
                originalName: fileRecord.originalName,
                size: fileRecord.size,
                mimeType: fileRecord.mimeType,
                uploadedAt: fileRecord.uploadedAt,
                status: fileRecord.status
            }
        })
    } catch (err) {
        console.error('File Upload Error:', err)
        res.status(500).json({ error: err.message || 'Failed to process file upload.' })
    }
}

/**
 * List files for the authenticated user (optionally filtered by subjectName)
 */
export const getFiles = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        const { subjectName } = req.query

        let files = []
        try {
            // Attempt DynamoDB Query
            const queryParams = {
                TableName: TABLE_FILES,
                KeyConditionExpression: "userId = :uid",
                ExpressionAttributeValues: { ":uid": userId }
            }
            if (subjectName) {
                queryParams.FilterExpression = "subjectName = :subj"
                queryParams.ExpressionAttributeValues[":subj"] = subjectName
            }
            const data = await dynamoDb.send(new QueryCommand(queryParams))
            files = data.Items || []
        } catch (queryErr) {
            // Fallback scan if GSI / Key schema differs
            const scanData = await dynamoDb.send(new ScanCommand({
                TableName: TABLE_FILES
            }))
            files = (scanData.Items || []).filter(f => f.userId === userId && (!subjectName || f.subjectName === subjectName))
        }

        // Sort descending by upload date
        files.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))

        res.json({
            success: true,
            files: files.map(f => ({
                fileId: f.fileId,
                userId: f.userId,
                subjectName: f.subjectName,
                originalName: f.originalName || f.fileName,
                name: f.originalName || f.fileName,
                size: f.size,
                mimeType: f.mimeType,
                uploadedAt: f.uploadedAt,
                status: f.status || 'ready'
            }))
        })
    } catch (err) {
        console.error('Fetch Files Error:', err)
        res.status(500).json({ error: 'Failed to retrieve files.' })
    }
}

/**
 * Get single file metadata
 */
export const getFileMetadata = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { fileId } = req.params

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        const data = await dynamoDb.send(new GetCommand({
            TableName: TABLE_FILES,
            Key: { fileId }
        }))

        const file = data.Item
        if (!file) {
            return res.status(404).json({ error: 'File not found.' })
        }

        if (file.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to access this file.' })
        }

        res.json({
            success: true,
            file: {
                fileId: file.fileId,
                userId: file.userId,
                subjectName: file.subjectName,
                originalName: file.originalName,
                name: file.originalName,
                size: file.size,
                mimeType: file.mimeType,
                uploadedAt: file.uploadedAt,
                status: file.status
            }
        })
    } catch (err) {
        console.error('Get File Metadata Error:', err)
        res.status(500).json({ error: 'Failed to retrieve file metadata.' })
    }
}

/**
 * Stream/view PDF content
 */
export const getFileContent = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { fileId } = req.params

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        const data = await dynamoDb.send(new GetCommand({
            TableName: TABLE_FILES,
            Key: { fileId }
        }))

        const file = data.Item
        if (!file) {
            return res.status(404).json({ error: 'File metadata not found.' })
        }

        if (file.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to access this file.' })
        }

        const storedPath = getStoredFilePath(file)
        if (!storedPath) {
            return res.status(404).json({ error: 'Physical PDF file was not found in storage.' })
        }

        res.setHeader('Content-Type', file.mimeType || 'application/pdf')
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName || 'document.pdf')}"`)
        if (file.size) {
            res.setHeader('Content-Length', file.size)
        }

        const stream = getFileStream(file)
        stream.on('error', (streamErr) => {
            console.error('File stream error:', streamErr)
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream file content.' })
            }
        })
        stream.pipe(res)
    } catch (err) {
        console.error('Get File Content Error:', err)
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to retrieve file content.' })
        }
    }
}

/**
 * Delete a file
 */
export const deleteFile = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { fileId } = req.params

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        const data = await dynamoDb.send(new GetCommand({
            TableName: TABLE_FILES,
            Key: { fileId }
        }))

        const file = data.Item
        if (!file) {
            return res.status(404).json({ error: 'File not found.' })
        }

        if (file.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this file.' })
        }

        // 1. Delete physical file
        await deleteStoredFile(file)

        // 2. Delete database file record
        await dynamoDb.send(new DeleteCommand({
            TableName: TABLE_FILES,
            Key: { fileId }
        }))

        // 3. Delete associated summary and quiz if any
        try {
            await Promise.all([
                dynamoDb.send(new DeleteCommand({ TableName: TABLE_SUMMARIES, Key: { fileId } })),
                dynamoDb.send(new DeleteCommand({ TableName: TABLE_QUIZZES, Key: { fileId } }))
            ])
        } catch (_) {}

        res.json({
            success: true,
            message: 'File deleted successfully.',
            fileId
        })
    } catch (err) {
        console.error('Delete File Error:', err)
        res.status(500).json({ error: 'Failed to delete file.' })
    }
}

/**
 * Get existing persistent summary for a file
 */
export const getFileSummary = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { fileId } = req.params

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        // 1. Verify file exists and belongs to user
        const fileData = await dynamoDb.send(new GetCommand({
            TableName: TABLE_FILES,
            Key: { fileId }
        }))

        const file = fileData.Item
        if (!file) {
            return res.status(404).json({ error: 'File not found.' })
        }

        if (file.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to access this summary.' })
        }

        // 2. Fetch summary record
        let summaryRecord = null
        try {
            const summaryData = await dynamoDb.send(new GetCommand({
                TableName: TABLE_SUMMARIES,
                Key: { fileId }
            }))
            summaryRecord = summaryData.Item
        } catch (_) {}

        if (!summaryRecord) {
            return res.json({
                success: true,
                cached: false,
                summary: null
            })
        }

        res.json({
            success: true,
            cached: true,
            summary: {
                summaryId: summaryRecord.summaryId,
                fileId: summaryRecord.fileId,
                userId: summaryRecord.userId,
                summary: summaryRecord.summary,
                status: summaryRecord.status || 'completed',
                createdAt: summaryRecord.createdAt,
                updatedAt: summaryRecord.updatedAt
            }
        })
    } catch (err) {
        console.error('Get Summary Error:', err)
        res.status(500).json({ error: 'Failed to retrieve file summary.' })
    }
}

/**
 * Generate or retrieve persistent summary for a file
 */
export const generateOrGetFileSummary = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { fileId } = req.params
        const { text, forceRegenerate = false } = req.body

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        // 1. Verify file exists and belongs to user
        const fileData = await dynamoDb.send(new GetCommand({
            TableName: TABLE_FILES,
            Key: { fileId }
        }))

        const file = fileData.Item
        if (!file) {
            return res.status(404).json({ error: 'File not found.' })
        }

        if (file.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to generate a summary for this file.' })
        }

        // 2. If not forcing regenerate, check if summary already exists in DB
        if (!forceRegenerate) {
            try {
                const existingData = await dynamoDb.send(new GetCommand({
                    TableName: TABLE_SUMMARIES,
                    Key: { fileId }
                }))
                if (existingData.Item && existingData.Item.summary) {
                    return res.json({
                        success: true,
                        cached: true,
                        summary: existingData.Item
                    })
                }
            } catch (_) {}
        }

        // 3. Validate extracted text
        const cleanText = (text || '').trim()
        if (!cleanText || cleanText.length < 30) {
            return res.status(400).json({
                error: 'This PDF does not contain extractable text. Scanned or image-based PDFs require OCR.'
            })
        }

        // 4. Generate AI summary via aiService
        const generatedSummary = await generateDocumentSummary(cleanText)

        // 5. Persist summary permanently
        const summaryRecord = {
            summaryId: crypto.randomUUID(),
            fileId,
            userId,
            fileName: file.originalName || file.name,
            subjectName: file.subjectName,
            summary: generatedSummary,
            status: 'completed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        await dynamoDb.send(new PutCommand({
            TableName: TABLE_SUMMARIES,
            Item: summaryRecord
        }))

        res.json({
            success: true,
            cached: false,
            summary: summaryRecord
        })
    } catch (err) {
        console.error('Generate Summary Error:', err)
        res.status(500).json({
            error: err.message || 'Failed to generate PDF summary.'
        })
    }
}

/**
 * Get existing persistent quiz for a file
 */
export const getFileQuiz = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { fileId } = req.params

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        const fileData = await dynamoDb.send(new GetCommand({
            TableName: TABLE_FILES,
            Key: { fileId }
        }))

        const file = fileData.Item
        if (!file) {
            return res.status(404).json({ error: 'File not found.' })
        }

        if (file.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to access this quiz.' })
        }

        const quizData = await dynamoDb.send(new GetCommand({
            TableName: TABLE_QUIZZES,
            Key: { fileId }
        }))

        if (!quizData.Item || !quizData.Item.questions) {
            return res.json({
                success: true,
                cached: false,
                quiz: null
            })
        }

        res.json({
            success: true,
            cached: true,
            quiz: quizData.Item
        })
    } catch (err) {
        console.error('Get File Quiz Error:', err)
        res.status(500).json({ error: 'Failed to retrieve file quiz.' })
    }
}

/**
 * Generate or retrieve persistent quiz for a file
 */
export const generateOrGetFileQuiz = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { fileId } = req.params
        const { text, forceRegenerate = false } = req.body

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        // 1. Verify file ownership
        const fileData = await dynamoDb.send(new GetCommand({
            TableName: TABLE_FILES,
            Key: { fileId }
        }))

        const file = fileData.Item
        if (!file) {
            return res.status(404).json({ error: 'File not found.' })
        }

        if (file.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to generate a quiz for this file.' })
        }

        // 2. Return cached quiz if available and not forced
        if (!forceRegenerate) {
            try {
                const existingData = await dynamoDb.send(new GetCommand({
                    TableName: TABLE_QUIZZES,
                    Key: { fileId }
                }))
                if (existingData.Item && Array.isArray(existingData.Item.questions) && existingData.Item.questions.length > 0) {
                    return res.json({
                        success: true,
                        cached: true,
                        quiz: existingData.Item
                    })
                }
            } catch (_) {}
        }

        // 3. Validate extracted text
        const cleanText = (text || '').trim()
        if (!cleanText || cleanText.length < 30) {
            return res.status(400).json({
                error: 'This PDF does not contain extractable text to generate a quiz.'
            })
        }

        // 4. Generate structured 5 MCQ quiz via backend Groq AI
        const questions = await generateDocumentQuiz(cleanText)

        // 5. Persist quiz permanently
        const quizRecord = {
            quizId: crypto.randomUUID(),
            fileId,
            userId,
            fileName: file.originalName || file.name,
            subjectName: file.subjectName || 'General',
            questions,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        await dynamoDb.send(new PutCommand({
            TableName: TABLE_QUIZZES,
            Item: quizRecord
        }))

        res.json({
            success: true,
            cached: false,
            quiz: quizRecord
        })
    } catch (err) {
        console.error('Generate Quiz Error:', err)
        res.status(500).json({
            error: err.message || 'Failed to generate quiz.'
        })
    }
}

/**
 * Save quiz completion score permanently to database
 */
export const saveQuizResult = async (req, res) => {
    try {
        const userId = getRequestUserId(req)
        const { fileId } = req.params
        const { score, total, pct, answers, wrongTopics, subjectName, fileName } = req.body

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user authentication identity.' })
        }

        const scoreId = crypto.randomUUID()
        const now = new Date().toISOString()

        const scoreRecord = {
            id: scoreId,
            scoreId,
            userId,
            fileId: fileId || null,
            subjectName: subjectName || 'General',
            fileName: fileName || 'document.pdf',
            score: Number(score) || 0,
            total: Number(total) || 5,
            pct: pct !== undefined ? Number(pct) : Math.round(((Number(score) || 0) / (Number(total) || 5)) * 100),
            answers: answers || [],
            wrongTopics: wrongTopics || [],
            date: now.slice(0, 10),
            timestamp: now
        }

        await dynamoDb.send(new PutCommand({
            TableName: TABLE_SCORES,
            Item: scoreRecord
        }))

        res.status(201).json({
            success: true,
            message: 'Quiz score saved permanently.',
            score: scoreRecord
        })
    } catch (err) {
        console.error('Save Quiz Score Error:', err)
        res.status(500).json({ error: 'Failed to save quiz score.' })
    }
}

