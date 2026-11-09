import express from 'express'
import { createRoom, getRoom, generateToken } from '../controllers/meetingController.js'
import { asyncHandler, rateLimit } from '../middleware/http.js'

const router = express.Router()
router.post('/rooms', rateLimit({ name: 'room-create', max: 20, windowMs: 60 * 60_000 }), asyncHandler(createRoom))
router.get('/rooms/:roomId', asyncHandler(getRoom))
router.post('/rooms/:roomId/token', rateLimit({ name: 'room-token', max: 30, windowMs: 60_000 }), asyncHandler(generateToken))
export default router
