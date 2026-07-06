import express from 'express'
import {
  listProblems,
  getOneProblem,
  executeCode,
  submitCode,
  getUserSubmissions,
  getAIReview,
  getAIHint,
  getAIDebug,
  getInterviewQuestions,
  getMockInterview,
  getUserDashboard,
  getGamificationProfile
} from '../controllers/codingController.js'
import {
  createContest,
  listContests,
  getContest,
  joinContest,
  getLeaderboard
} from '../controllers/contestController.js'

const router = express.Router()

// Problems
router.get('/problems', listProblems)
router.get('/problems/:id', getOneProblem)

// Code execution
router.post('/run', executeCode)
router.post('/submit', submitCode)

// Submissions
router.get('/submissions/:userId', getUserSubmissions)

// AI features
router.post('/ai/review', getAIReview)
router.post('/ai/hint', getAIHint)
router.post('/ai/debug', getAIDebug)
router.post('/ai/interview', getInterviewQuestions)
router.post('/ai/mock-interview', getMockInterview)

// Dashboard & gamification
router.get('/dashboard/:userId', getUserDashboard)
router.get('/gamification/:userId', getGamificationProfile)

// Contests
router.post('/contests', createContest)
router.get('/contests', listContests)
router.get('/contests/:id', getContest)
router.post('/contests/:id/join', joinContest)
router.get('/contests/:id/leaderboard', getLeaderboard)

export default router
