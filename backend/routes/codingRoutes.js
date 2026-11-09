import express from 'express'
import {
  listProblems, getOneProblem, executeCode, submitCode, getUserSubmissions, getAIReview, getAIHint, getAIDebug,
  getInterviewQuestions, getMockInterview, getUserDashboard, getGamificationProfile
} from '../controllers/codingController.js'
import { createContest, listContests, getContest, joinContest, getLeaderboard } from '../controllers/contestController.js'
import { asyncHandler, rateLimit } from '../middleware/http.js'

const router = express.Router()
const a = asyncHandler
// Code execution is the scarcest resource (Judge0 quota): limit per user.
const execLimiter = rateLimit({ name: 'exec', max: 20, windowMs: 60_000 })
const aiLimiter = rateLimit({ name: 'coding-ai', max: 20, windowMs: 60_000 })

router.get('/problems', a(listProblems))
router.get('/problems/:id', a(getOneProblem))
router.post('/run', execLimiter, a(executeCode))
router.post('/submit', execLimiter, a(submitCode))
router.get('/submissions', a(getUserSubmissions))

router.post('/ai/review', aiLimiter, a(getAIReview))
router.post('/ai/hint', aiLimiter, a(getAIHint))
router.post('/ai/debug', aiLimiter, a(getAIDebug))
router.post('/ai/interview', aiLimiter, a(getInterviewQuestions))
router.post('/ai/mock-interview', aiLimiter, a(getMockInterview))

router.get('/dashboard', a(getUserDashboard))
router.get('/gamification', a(getGamificationProfile))

router.post('/contests', rateLimit({ name: 'contest-create', max: 10, windowMs: 60 * 60_000 }), a(createContest))
router.get('/contests', a(listContests))
router.get('/contests/:id', a(getContest))
router.post('/contests/:id/join', a(joinContest))
router.get('/contests/:id/leaderboard', a(getLeaderboard))
export default router
