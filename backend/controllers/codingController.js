import crypto from 'crypto'
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDb from '../config/dynamoDb.js'
import { getProblems, getProblemById } from '../services/problemsData.js'
import { runCode, runTestCases, SUPPORTED_LANGUAGES } from '../services/judge0Service.js'
import { reviewCode, generateHint, debugCode, generateInterviewQuestions, conductMockInterview } from '../services/aiReviewService.js'
import {
  getProfile, recordAcceptedSubmission, markProblemAttempt, incrementCounter, getAllBadges, publicProfile
} from '../services/gamificationService.js'
import { recordContestSolve } from './contestController.js'
import { HttpError, requireString } from '../middleware/http.js'

const SUBMISSIONS_TABLE = 'studymate_submissions'
const VISIBLE_TESTS = 2
const MAX_CODE_LENGTH = 50_000

function validateCode(body) {
  const code = requireString(body.code, 'code', { max: MAX_CODE_LENGTH })
  const language = String(body.language || '').toLowerCase()
  if (!SUPPORTED_LANGUAGES.includes(language)) throw new HttpError(400, `language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`)
  return { code, language }
}

function loadProblem(id) {
  const problem = getProblemById(id)
  if (!problem) throw new HttpError(404, 'Problem not found')
  return problem
}

/** Public problem view: visible examples only. Hidden test cases never leave the server. */
function publicProblem(p) {
  const { testCases, ...rest } = p
  return {
    ...rest,
    sampleTests: testCases.slice(0, VISIBLE_TESTS),
    totalTests: testCases.length
  }
}

/** Hide input/expected/actual for hidden cases; keep verdicts and resource usage. */
function redactResults(results) {
  return results.map((r, i) => (i < VISIBLE_TESTS ? r : {
    testCase: r.testCase, verdict: r.verdict, passed: r.passed, time: r.time, memory: r.memory, hidden: true,
    // Compiler errors are about the user's code, not the test, so they're safe to show.
    compile_output: r.verdict === 'Compilation Error' ? r.compile_output : null,
    stderr: r.verdict === 'Runtime Error' ? (r.stderr || '').split('\n').slice(-5).join('\n') : null
  }))
}

async function solvedSet(userId) {
  const profile = await getProfile(userId)
  return new Set(profile.solvedProblems || [])
}

// GET /problems
export const listProblems = async (req, res) => {
  const { difficulty, category, search } = req.query
  const solved = await solvedSet(req.user.userId)
  const list = getProblems({ difficulty, category, search }).map(p => ({
    id: p.id, title: p.title, difficulty: p.difficulty, category: p.category, timeLimit: p.timeLimit, solved: solved.has(p.id)
  }))
  res.json({ total: list.length, problems: list })
}

// GET /problems/:id
export const getOneProblem = async (req, res) => {
  const problem = loadProblem(req.params.id)
  // First open is recorded server-side so the speed badge can't be spoofed by the client.
  await markProblemAttempt(req.user.userId, problem.id)
  res.json(publicProblem(problem))
}

// POST /run — visible tests only, or custom stdin. Not saved, no rewards.
export const executeCode = async (req, res) => {
  const { code, language } = validateCode(req.body)
  const { problemId, stdin } = req.body

  if (problemId) {
    const problem = loadProblem(problemId)
    if (typeof stdin === 'string') {
      // Custom input runs through the same driver as tests, so users write only the function.
      const { wrapCode } = await import('../services/codeWrapper.js')
      return res.json({ mode: 'custom', ...(await runCode(wrapCode(code, language, problem.driverMeta), language, stdin.slice(0, 100_000))) })
    }
    const results = await runTestCases(code, language, problem.testCases.slice(0, VISIBLE_TESTS), problem.timeLimit, problem.driverMeta)
    return res.json({ mode: 'tests', ...results })
  }
  if (typeof stdin !== 'string') throw new HttpError(400, 'Provide a problemId or stdin.')
  res.json({ mode: 'custom', ...(await runCode(code, language, stdin.slice(0, 100_000))) })
}

// POST /submit — all tests, persisted, rewards on first Accepted.
export const submitCode = async (req, res) => {
  const userId = req.user.userId
  const { code, language } = validateCode(req.body)
  const problem = loadProblem(req.body.problemId)
  const contestId = req.body.contestId ? String(req.body.contestId) : null

  const results = await runTestCases(code, language, problem.testCases, problem.timeLimit, problem.driverMeta)
  const now = new Date().toISOString()
  // Time-prefixed sort key -> submissions come back in chronological order.
  const submissionId = `${now}#${crypto.randomUUID()}`
  const submission = {
    userId, submissionId, problemId: problem.id, problemTitle: problem.title, difficulty: problem.difficulty,
    language, code, verdict: results.verdict, totalTests: results.totalTests, passedTests: results.passedTests,
    runtime: results.maxTime, memory: results.maxMemory, results: redactResults(results.results),
    contestId, timestamp: now
  }
  await dynamoDb.send(new PutCommand({ TableName: SUBMISSIONS_TABLE, Item: submission }))

  let gamification = null
  let contest = null
  if (results.allPassed) {
    gamification = await recordAcceptedSubmission(userId, problem, language)
    if (contestId) contest = await recordContestSolve(contestId, userId, problem)
  }

  res.json({
    submissionId, verdict: results.verdict, totalTests: results.totalTests, passedTests: results.passedTests,
    runtime: results.maxTime, memory: results.maxMemory, results: submission.results, gamification, contest
  })
}

// GET /submissions[?problemId=]
export const getUserSubmissions = async (req, res) => {
  const params = {
    TableName: SUBMISSIONS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': req.user.userId },
    ScanIndexForward: false,
    Limit: Math.min(Number(req.query.limit) || 100, 200)
  }
  if (req.query.problemId) {
    params.FilterExpression = 'problemId = :pid'
    params.ExpressionAttributeValues[':pid'] = String(req.query.problemId)
    delete params.Limit // DynamoDB applies Limit before the filter
  }
  const data = await dynamoDb.send(new QueryCommand(params))
  res.json({ total: data.Items.length, submissions: data.Items })
}

export const getAIReview = async (req, res) => {
  const { code, language } = validateCode(req.body)
  res.json(await reviewCode(code, language, String(req.body.problemTitle || 'Unknown Problem').slice(0, 200)))
}

export const getAIHint = async (req, res) => {
  const problem = loadProblem(req.body.problemId)
  const level = Math.min(Math.max(Number(req.body.hintLevel) || 1, 1), 3)
  res.json(await generateHint(problem.description, problem.title, problem.constraints, level))
}

export const getAIDebug = async (req, res) => {
  const { code, language } = validateCode(req.body)
  const analysis = await debugCode(code, language, String(req.body.error || 'No error provided'))
  await incrementCounter(req.user.userId, 'debugUses')
  res.json(analysis)
}

export const getInterviewQuestions = async (req, res) => {
  const topic = requireString(req.body.topic, 'topic', { max: 100 })
  res.json({ topic, questions: await generateInterviewQuestions(topic, req.body.count) })
}

export const getMockInterview = async (req, res) => {
  const topic = requireString(req.body.topic, 'topic', { max: 100 })
  res.json(await conductMockInterview(topic, Array.isArray(req.body.messages) ? req.body.messages : []))
}

// GET /dashboard
export const getUserDashboard = async (req, res) => {
  const userId = req.user.userId
  const [profile, subs] = await Promise.all([
    getProfile(userId),
    dynamoDb.send(new QueryCommand({
      TableName: SUBMISSIONS_TABLE, KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId }, ScanIndexForward: false
    }))
  ])
  const all = subs.Items || []
  const accepted = all.filter(s => s.verdict === 'Accepted').length
  res.json({
    profile: publicProfile(profile),
    stats: {
      totalSubmissions: all.length,
      acceptedSubmissions: accepted,
      acceptanceRate: all.length ? Math.round((accepted / all.length) * 100) : 0
    },
    recentSubmissions: all.slice(0, 10).map(s => ({
      submissionId: s.submissionId, problemId: s.problemId, problemTitle: s.problemTitle,
      language: s.language, verdict: s.verdict, timestamp: s.timestamp, difficulty: s.difficulty
    }))
  })
}

// GET /gamification
export const getGamificationProfile = async (req, res) => {
  const profile = await getProfile(req.user.userId)
  res.json({ ...publicProfile(profile), allBadges: getAllBadges() })
}
