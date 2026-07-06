import express from 'express'
import { getProfile, syncAppState, saveQuizScore, getQuizScores } from '../controllers/dbController.js'

const router = express.Router()

router.get('/:userId/profile', getProfile)
router.post('/:userId/sync', syncAppState)
router.post('/:userId/scores', saveQuizScore)
router.get('/:userId/scores', getQuizScores)

export default router
