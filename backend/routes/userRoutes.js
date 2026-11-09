import express from 'express'
import { getProfile, updatePreferences, syncAppState, getQuizScores } from '../controllers/dbController.js'
import { asyncHandler } from '../middleware/http.js'

const router = express.Router()
router.get('/me', asyncHandler(getProfile))
router.patch('/me/preferences', asyncHandler(updatePreferences))
router.put('/me/state', asyncHandler(syncAppState))
router.get('/me/scores', asyncHandler(getQuizScores))
export default router
