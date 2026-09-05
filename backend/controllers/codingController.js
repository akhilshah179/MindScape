import { getProblems, getProblemById } from '../services/problemsData.js'
import { runCode as judge0Run, runTestCases, getLanguageId, getVerdict } from '../services/judge0Service.js'
import { reviewCode, generateHint, debugCode, generateInterviewQuestions, conductMockInterview } from '../services/aiReviewService.js'
import { awardXP, updateStreak, getProfile, updateLanguageUsage, updateHeatmap, XP_REWARDS } from '../services/gamificationService.js'
import { updateContestScore } from './contestController.js'
import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import crypto from 'crypto'

const SUBMISSIONS_TABLE = 'studymate_submissions'

// GET /problems — list problems with optional filters
export const listProblems = async (req, res) => {
  try {
    const { difficulty, category, search } = req.query
    const filtered = getProblems({ difficulty, category, search })

    const problemList = filtered.map(p => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      category: p.category,
      timeLimit: p.timeLimit
    }))

    res.json({
      total: problemList.length,
      problems: problemList
    })
  } catch (err) {
    console.error('List Problems Error:', err)
    res.status(500).json({ error: 'Failed to fetch problems' })
  }
}

// GET /problems/:id — get full problem details
export const getOneProblem = async (req, res) => {
  try {
    const { id } = req.params
    const problem = getProblemById(id)

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' })
    }

    res.json(problem)
  } catch (err) {
    console.error('Get Problem Error:', err)
    res.status(500).json({ error: 'Failed to fetch problem' })
  }
}

// POST /run — execute code against visible test cases only (no save)
export const executeCode = async (req, res) => {
  try {
    const { code, language, problemId, stdin } = req.body

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' })
    }

    // If a specific stdin is provided, run against that
    if (stdin !== undefined) {
      const result = await judge0Run(code, language, stdin)
      return res.json(result)
    }

    // Otherwise run against visible test cases (from examples)
    const problem = getProblemById(problemId)
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' })
    }

    // Use only the first 2 test cases for "Run" (visible ones)
    const visibleTests = problem.testCases.slice(0, 2)
    const results = await runTestCases(code, language, visibleTests, problem.timeLimit, problem.driverMeta)

    res.json(results)
  } catch (err) {
    console.error('Execute Code Error:', err.message)
    res.status(500).json({ error: 'Failed to execute code' })
  }
}

// POST /submit — run against ALL test cases, save submission, award XP
export const submitCode = async (req, res) => {
  try {
    const { userId, problemId, language, code, contestId } = req.body

    if (!userId || !problemId || !language || !code) {
      return res.status(400).json({ error: 'userId, problemId, language, and code are required' })
    }

    const problem = getProblemById(problemId)
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' })
    }

    const startTime = Date.now()

    // Run against ALL test cases
    const results = await runTestCases(code, language, problem.testCases, problem.timeLimit, problem.driverMeta)

    const endTime = Date.now()
    const timeTaken = endTime - startTime

    const verdict = results.allPassed ? 'Accepted' : 'Failed'
    const submissionId = crypto.randomUUID()

    // Save submission to DynamoDB
    const submission = {
      submissionId,
      userId,
      problemId,
      problemTitle: problem.title,
      language,
      code,
      verdict,
      totalTests: results.totalTests,
      passedTests: results.passedTests,
      results: results.results,
      timeTaken,
      difficulty: problem.difficulty,
      timestamp: new Date().toISOString()
    }

    await dynamoDb.send(new PutCommand({
      TableName: SUBMISSIONS_TABLE,
      Item: submission
    }))

    let gamificationResult = null
    let contestResult = null

    // Award XP and update stats on Accepted
    if (verdict === 'Accepted') {
      // 1. If part of an active contest, update contest score & leaderboard
      if (contestId) {
        try {
          contestResult = await updateContestScore(contestId, userId, problemId, problem.difficulty)
        } catch (cErr) {
          console.warn('Contest score update failed:', cErr.message)
        }
      }

      // 2. Prevent duplicate XP awards for repeatedly submitting already-solved problems
      const prevSubmissions = await dynamoDb.send(new QueryCommand({
        TableName: SUBMISSIONS_TABLE,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId }
      })).catch(() => ({ Items: [] }))

      const alreadySolved = (prevSubmissions.Items || []).some(s =>
        s.problemId === problemId && s.verdict === 'Accepted' && s.submissionId !== submissionId
      )

      if (!alreadySolved) {
        const xpAmount = XP_REWARDS[problem.difficulty] || 50

        gamificationResult = await awardXP(userId, xpAmount, `Solved ${problem.title}`, {
          problemId,
          difficulty: problem.difficulty,
          language
        })

        // Update difficulty-specific solve count
        const diffKey = `${problem.difficulty.toLowerCase()}Solved`
        const updateExpr = `SET totalSolved = if_not_exists(totalSolved, :zero) + :one, ${diffKey} = if_not_exists(${diffKey}, :zero) + :one, updatedAt = :now`

        await dynamoDb.send(new UpdateCommand({
          TableName: 'studymate_gamification',
          Key: { userId },
          UpdateExpression: updateExpr,
          ExpressionAttributeValues: {
            ':zero': 0,
            ':one': 1,
            ':now': new Date().toISOString()
          }
        }))
      }

      // Check if fast solve (under 5 minutes)
      if (timeTaken < 300000) {
        await dynamoDb.send(new UpdateCommand({
          TableName: 'studymate_gamification',
          Key: { userId },
          UpdateExpression: 'SET fastSolve = :fs',
          ExpressionAttributeValues: { ':fs': true }
        })).catch(() => {})
      }

      // Update streak, heatmap, and language usage
      await Promise.all([
        updateStreak(userId).catch(() => {}),
        updateHeatmap(userId).catch(() => {}),
        updateLanguageUsage(userId, language).catch(() => {})
      ])
    }

    res.json({
      submissionId,
      verdict,
      totalTests: results.totalTests,
      passedTests: results.passedTests,
      results: results.results,
      timeTaken,
      gamification: gamificationResult,
      contest: contestResult
    })
  } catch (err) {
    console.error('Submit Code Error:', err.message)
    res.status(500).json({ error: 'Failed to submit code' })
  }
}

// GET /submissions/:userId — fetch user submissions
export const getUserSubmissions = async (req, res) => {
  try {
    const { userId } = req.params
    const { problemId } = req.query

    let filterExpression = undefined
    let expressionAttributeValues = { ':uid': userId }
    let expressionAttributeNames = undefined

    const params = {
      TableName: SUBMISSIONS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false
    }

    if (problemId) {
      params.FilterExpression = 'problemId = :pid'
      params.ExpressionAttributeValues[':pid'] = problemId
    }

    const data = await dynamoDb.send(new QueryCommand(params))

    res.json({
      total: (data.Items || []).length,
      submissions: data.Items || []
    })
  } catch (err) {
    console.error('Get Submissions Error:', err)
    res.status(500).json({ error: 'Failed to fetch submissions' })
  }
}

// POST /ai/review — AI code review
export const getAIReview = async (req, res) => {
  try {
    const { code, language, problemTitle } = req.body

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' })
    }

    const review = await reviewCode(code, language, problemTitle || 'Unknown Problem')
    res.json(review)
  } catch (err) {
    console.error('AI Review Error:', err.message)
    res.status(500).json({ error: 'Failed to generate AI review' })
  }
}

// POST /ai/hint — get AI hint for a problem
export const getAIHint = async (req, res) => {
  try {
    const { problemId, hintLevel } = req.body

    if (!problemId) {
      return res.status(400).json({ error: 'problemId is required' })
    }

    const problem = getProblemById(problemId)
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' })
    }

    const level = Math.min(Math.max(hintLevel || 1, 1), 3)
    const hint = await generateHint(problem.description, problem.title, problem.constraints, level)

    res.json(hint)
  } catch (err) {
    console.error('AI Hint Error:', err.message)
    res.status(500).json({ error: 'Failed to generate AI hint' })
  }
}

// POST /ai/debug — AI code debugging
export const getAIDebug = async (req, res) => {
  try {
    const { code, language, error } = req.body

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' })
    }

    // Track debug usage for badges
    if (req.body.userId) {
      try {
        await dynamoDb.send(new (await import('@aws-sdk/lib-dynamodb')).UpdateCommand({
          TableName: 'studymate_gamification',
          Key: { userId: req.body.userId },
          UpdateExpression: 'SET debugUses = if_not_exists(debugUses, :zero) + :one',
          ExpressionAttributeValues: { ':zero': 0, ':one': 1 }
        }))
      } catch (e) {
        // Non-critical, continue
      }
    }

    const analysis = await debugCode(code, language, error || 'No error provided')
    res.json(analysis)
  } catch (err) {
    console.error('AI Debug Error:', err.message)
    res.status(500).json({ error: 'Failed to generate AI debug analysis' })
  }
}

// POST /ai/interview — generate interview questions
export const getInterviewQuestions = async (req, res) => {
  try {
    const { topic, count } = req.body

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' })
    }

    const questions = await generateInterviewQuestions(topic, count || 5)
    res.json({ topic, questions })
  } catch (err) {
    console.error('Interview Questions Error:', err.message)
    res.status(500).json({ error: 'Failed to generate interview questions' })
  }
}

// POST /ai/mock-interview — conduct mock interview
export const getMockInterview = async (req, res) => {
  try {
    const { topic, messages } = req.body

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' })
    }

    const response = await conductMockInterview(topic, messages || [])
    res.json(response)
  } catch (err) {
    console.error('Mock Interview Error:', err.message)
    res.status(500).json({ error: 'Failed to conduct mock interview' })
  }
}

// GET /dashboard/:userId — aggregated dashboard
export const getUserDashboard = async (req, res) => {
  try {
    const { userId } = req.params

    // Fetch gamification profile
    const profile = await getProfile(userId)

    // Fetch recent submissions
    let recentSubmissions = []
    try {
      const data = await dynamoDb.send(new QueryCommand({
        TableName: SUBMISSIONS_TABLE,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false,
        Limit: 10
      }))
      recentSubmissions = data.Items || []
    } catch (e) {
      // Table might not exist yet
    }

    // Calculate stats
    const totalSubmissions = recentSubmissions.length
    const acceptedSubmissions = recentSubmissions.filter(s => s.verdict === 'Accepted').length

    const dashboard = {
      profile: {
        userId: profile.userId,
        xp: profile.xp || 0,
        level: profile.level || 0,
        totalSolved: profile.totalSolved || 0,
        easySolved: profile.easySolved || 0,
        mediumSolved: profile.mediumSolved || 0,
        hardSolved: profile.hardSolved || 0,
        currentStreak: profile.currentStreak || 0,
        maxStreak: profile.maxStreak || 0,
        badges: profile.badges || [],
        languageUsage: profile.languageUsage || {},
        heatmap: profile.heatmap || {}
      },
      stats: {
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate: totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0
      },
      recentSubmissions: recentSubmissions.map(s => ({
        submissionId: s.submissionId,
        problemId: s.problemId,
        problemTitle: s.problemTitle,
        language: s.language,
        verdict: s.verdict,
        timestamp: s.timestamp
      }))
    }

    res.json(dashboard)
  } catch (err) {
    console.error('Dashboard Error:', err)
    res.status(500).json({ error: 'Failed to fetch dashboard' })
  }
}

// GET /gamification/:userId — gamification profile
export const getGamificationProfile = async (req, res) => {
  try {
    const { userId } = req.params
    const profile = await getProfile(userId)

    res.json({
      ...profile,
      nextLevelXP: Math.pow((profile.level || 0) + 1, 2) * 100,
      allBadges: (await import('../services/gamificationService.js')).getAllBadges()
    })
  } catch (err) {
    console.error('Gamification Profile Error:', err)
    res.status(500).json({ error: 'Failed to fetch gamification profile' })
  }
}
