import express from 'express'
import { handleChat } from '../controllers/aiController.js'
import { asyncHandler } from '../middleware/http.js'

const router = express.Router()
router.post('/chat', asyncHandler(handleChat))
export default router
