import express from 'express'
import multer from 'multer'
import {
  uploadFile, getFiles, getFileMetadata, getFileContent, deleteFile, getFileSummary, generateOrGetFileSummary,
  getFileQuiz, generateOrGetFileQuiz, saveQuizResult, MAX_FILE_SIZE
} from '../controllers/fileController.js'
import { asyncHandler, rateLimit, HttpError } from '../middleware/http.js'

const router = express.Router()
const a = asyncHandler
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 5 } })
const uploadSingle = (req, res, next) => upload.single('file')(req, res, (err) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'File is too large. Maximum size is 25 MB.'))
  if (err) return next(new HttpError(400, err.message))
  next()
})
const aiLimiter = rateLimit({ name: 'file-ai', max: 15, windowMs: 60_000 })

router.post('/upload', rateLimit({ name: 'upload', max: 20, windowMs: 60_000 }), uploadSingle, a(uploadFile))
router.get('/', a(getFiles))
router.get('/:fileId', a(getFileMetadata))
router.get('/:fileId/content', a(getFileContent))
router.get('/:fileId/summary', a(getFileSummary))
router.post('/:fileId/summary', aiLimiter, a(generateOrGetFileSummary))
router.get('/:fileId/quiz', a(getFileQuiz))
router.post('/:fileId/quiz', aiLimiter, a(generateOrGetFileQuiz))
router.post('/:fileId/quiz/score', a(saveQuizResult))
router.delete('/:fileId', a(deleteFile))
export default router
