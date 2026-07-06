import express from 'express'
import { handleChat, generateQuiz, summarizeText } from '../controllers/aiController.js'

const router = express.Router()

router.post('/chat', handleChat)
router.post('/quiz', generateQuiz)
router.post('/summarize', summarizeText)

export default router
