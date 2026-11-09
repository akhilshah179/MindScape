import crypto from 'crypto'
import { PutCommand, GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDb from '../config/dynamoDb.js'
import { getProblemById } from '../services/problemsData.js'
import { incrementCounter } from '../services/gamificationService.js'
import { withLock } from '../services/lock.js'
import { HttpError, requireString } from '../middleware/http.js'

const TABLE = 'studymate_contests'
const POINTS = { Easy: 100, Medium: 200, Hard: 300 }

const statusOf = (c, now = new Date()) =>
  now < new Date(c.startTime) ? 'upcoming' : now <= new Date(c.endTime) ? 'active' : 'completed'

async function loadContest(id) {
  const { Item } = await dynamoDb.send(new GetCommand({ TableName: TABLE, Key: { contestId: String(id) } }))
  if (!Item) throw new HttpError(404, 'Contest not found')
  return Item
}

function rankParticipants(participants) {
  // Score desc, then penalty time asc (time of last scoring solve since start), then join order.
  return [...participants]
    .sort((a, b) => (b.score - a.score) || ((a.totalTime || 0) - (b.totalTime || 0)) || a.joinedAt.localeCompare(b.joinedAt))
    .map((p, i) => ({
      rank: i + 1, userId: p.userId, userName: p.userName, score: p.score,
      solvedCount: (p.solvedProblems || []).length, totalTime: p.totalTime, joinedAt: p.joinedAt
    }))
}

// POST /contests
export const createContest = async (req, res) => {
  const title = requireString(req.body.title, 'title', { max: 120 })
  const description = typeof req.body.description === 'string' ? req.body.description.slice(0, 2000) : ''
  const problemIds = Array.isArray(req.body.problemIds) ? [...new Set(req.body.problemIds.map(String))] : []
  if (!problemIds.length || problemIds.length > 10) throw new HttpError(400, 'Choose between 1 and 10 problems.')
  const unknown = problemIds.filter(id => !getProblemById(id))
  if (unknown.length) throw new HttpError(400, `Unknown problem(s): ${unknown.join(', ')}`)
  const start = new Date(req.body.startTime), end = new Date(req.body.endTime)
  if (isNaN(start) || isNaN(end)) throw new HttpError(400, 'startTime and endTime must be valid dates.')
  if (end <= start) throw new HttpError(400, 'endTime must be after startTime.')
  if (end - start > 14 * 86400000) throw new HttpError(400, 'Contests can last at most 14 days.')

  const now = new Date().toISOString()
  const contest = {
    contestId: crypto.randomUUID(), title, description, problemIds,
    startTime: start.toISOString(), endTime: end.toISOString(),
    duration: Math.round((end - start) / 60000),
    createdBy: req.user.userId, createdByName: req.user.name,
    participants: [], createdAt: now, updatedAt: now
  }
  await dynamoDb.send(new PutCommand({ TableName: TABLE, Item: contest }))
  res.status(201).json({ success: true, contestId: contest.contestId, contest: { ...contest, status: statusOf(contest) } })
}

// GET /contests
export const listContests = async (req, res) => {
  const { Items = [] } = await dynamoDb.send(new ScanCommand({ TableName: TABLE }))
  const now = new Date()
  const contests = Items
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .map(c => ({
      contestId: c.contestId, title: c.title, description: c.description, problemCount: (c.problemIds || []).length,
      startTime: c.startTime, endTime: c.endTime, duration: c.duration, status: statusOf(c, now),
      participantCount: (c.participants || []).length, createdBy: c.createdBy,
      joined: (c.participants || []).some(p => p.userId === req.user.userId)
    }))
  res.json({ total: contests.length, contests })
}

// GET /contests/:id
export const getContest = async (req, res) => {
  const contest = await loadContest(req.params.id)
  const me = (contest.participants || []).find(p => p.userId === req.user.userId)
  const problems = contest.problemIds.map(pid => {
    const p = getProblemById(pid)
    return p
      ? { id: p.id, title: p.title, difficulty: p.difficulty, category: p.category, points: POINTS[p.difficulty] || 100, solved: Boolean(me?.solvedProblems?.includes(p.id)) }
      : { id: pid, title: 'Unavailable problem', difficulty: 'Unknown', category: 'Unknown', points: 0 }
  })
  const { participants, ...rest } = contest
  res.json({
    ...rest, status: statusOf(contest), problems, participantCount: (participants || []).length,
    joined: Boolean(me), myScore: me?.score ?? null
  })
}

// POST /contests/:id/join
export const joinContest = async (req, res) => {
  const { userId, name } = req.user
  const participant = await withLock(`contest:${req.params.id}`, async () => {
    const contest = await loadContest(req.params.id)
    if (statusOf(contest) === 'completed') throw new HttpError(400, 'Contest has already ended')
    if ((contest.participants || []).some(p => p.userId === userId)) throw new HttpError(409, 'You have already joined this contest')
    const p = { userId, userName: name || 'Anonymous', joinedAt: new Date().toISOString(), score: 0, solvedProblems: [], totalTime: 0 }
    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE, Key: { contestId: contest.contestId },
      UpdateExpression: 'SET participants = list_append(if_not_exists(participants, :e), :p), updatedAt = :now',
      ExpressionAttributeValues: { ':e': [], ':p': [p], ':now': new Date().toISOString(), ':updatedAt': contest.updatedAt },
      // Optimistic concurrency: fail if another process modified the contest since we read it.
      ConditionExpression: 'updatedAt = :updatedAt'
    }))
    return p
  })
  const newBadges = await incrementCounter(userId, 'contestsJoined')
  res.json({ success: true, message: 'Joined the contest', participant, newBadges })
}

// GET /contests/:id/leaderboard
export const getLeaderboard = async (req, res) => {
  const contest = await loadContest(req.params.id)
  const leaderboard = rankParticipants(contest.participants || [])
  res.json({ contestId: contest.contestId, contestTitle: contest.title, status: statusOf(contest), totalParticipants: leaderboard.length, leaderboard })
}

/**
 * Called after an Accepted submission that names a contest. Scores only when the contest is
 * active, the problem belongs to it, the user joined, and the problem wasn't already scored.
 * Returns { scored, reason?, score, solvedCount, rank }.
 */
export function recordContestSolve(contestId, userId, problem) {
  return withLock(`contest:${contestId}`, async () => {
    let contest
    try { contest = await loadContest(contestId) } catch { return { scored: false, reason: 'Contest not found' } }
    if (statusOf(contest) !== 'active') return { scored: false, reason: 'Contest is not active' }
    if (!contest.problemIds.includes(problem.id)) return { scored: false, reason: 'Problem is not part of this contest' }
    const participants = contest.participants || []
    const idx = participants.findIndex(p => p.userId === userId)
    if (idx === -1) return { scored: false, reason: 'Join the contest to score points' }
    const me = { ...participants[idx] }
    if ((me.solvedProblems || []).includes(problem.id)) {
      return { scored: false, reason: 'Already solved in this contest', score: me.score, solvedCount: me.solvedProblems.length }
    }
    me.score = (me.score || 0) + (POINTS[problem.difficulty] || 100)
    me.solvedProblems = [...(me.solvedProblems || []), problem.id]
    me.totalTime = Math.floor((Date.now() - new Date(contest.startTime)) / 1000)
    participants[idx] = me
    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE, Key: { contestId },
      UpdateExpression: 'SET participants = :p, updatedAt = :now',
      ConditionExpression: 'updatedAt = :prev',
      ExpressionAttributeValues: { ':p': participants, ':now': new Date().toISOString(), ':prev': contest.updatedAt }
    }))
    const rank = rankParticipants(participants).find(r => r.userId === userId)?.rank
    return { scored: true, score: me.score, solvedCount: me.solvedProblems.length, rank }
  })
}
