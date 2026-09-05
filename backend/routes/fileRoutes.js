import express from 'express'
import multer from 'multer'
import {
    uploadFile,
    getFiles,
    getFileMetadata,
    getFileContent,
    deleteFile,
    getFileSummary,
    generateOrGetFileSummary,
    getFileQuiz,
    generateOrGetFileQuiz,
    saveQuizResult
} from '../controllers/fileController.js'

const router = express.Router()

// Multer in-memory storage for validated stream-through writes
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25 MB
    }
})

// File routes
router.post('/upload', upload.single('file'), uploadFile)
router.get('/', getFiles)
router.get('/:fileId', getFileMetadata)
router.get('/:fileId/content', getFileContent)
router.get('/:fileId/summary', getFileSummary)
router.post('/:fileId/summary', generateOrGetFileSummary)
router.get('/:fileId/quiz', getFileQuiz)
router.post('/:fileId/quiz', generateOrGetFileQuiz)
router.post('/:fileId/quiz/score', saveQuizResult)
router.delete('/:fileId', deleteFile)

export default router
