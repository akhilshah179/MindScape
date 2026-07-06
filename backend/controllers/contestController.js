import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import crypto from 'crypto'

const TABLE = 'studymate_contests'

// POST /contests — create a new contest
export const createContest = async (req, res) => {
  try {
    const { title, description, problemIds, startTime, endTime, duration, createdBy } = req.body

    if (!title || !problemIds || !startTime || !endTime || !createdBy) {
      return res.status(400).json({ error: 'title, problemIds, startTime, endTime, and createdBy are required' })
    }

    const contestId = crypto.randomUUID()

    const contest = {
      contestId,
      title,
      description: description || '',
      problemIds,
      startTime,
      endTime,
      duration: duration || 90,
      createdBy,
      participants: [],
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await dynamoDb.send(new PutCommand({
      TableName: TABLE,
      Item: contest
    }))

    res.status(201).json({ success: true, contestId, contest })
  } catch (err) {
    console.error('Create Contest Error:', err)
    res.status(500).json({ error: 'Failed to create contest' })
  }
}

// GET /contests — list all contests
export const listContests = async (req, res) => {
  try {
    // Since we don't have a GSI on startTime, we scan and sort client-side
    // In production, you'd use a GSI or a different partition key strategy
    const data = await dynamoDb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'contestId > :empty',
      ExpressionAttributeValues: { ':empty': '' },
      ScanIndexForward: false
    }).catch(async () => {
      // Fallback: if QueryCommand fails (no sort key), use scan
      const { ScanCommand } = await import('@aws-sdk/lib-dynamodb')
      return dynamoDb.send(new ScanCommand({ TableName: TABLE }))
    }))

    const contests = (data.Items || []).sort((a, b) =>
      new Date(b.startTime) - new Date(a.startTime)
    )

    // Update contest statuses
    const now = new Date()
    const updatedContests = contests.map(c => {
      const start = new Date(c.startTime)
      const end = new Date(c.endTime)

      let status = 'upcoming'
      if (now >= start && now <= end) status = 'active'
      else if (now > end) status = 'completed'

      return { ...c, status }
    })

    res.json({
      total: updatedContests.length,
      contests: updatedContests.map(c => ({
        contestId: c.contestId,
        title: c.title,
        description: c.description,
        problemCount: (c.problemIds || []).length,
        startTime: c.startTime,
        endTime: c.endTime,
        duration: c.duration,
        status: c.status,
        participantCount: (c.participants || []).length,
        createdBy: c.createdBy
      }))
    })
  } catch (err) {
    console.error('List Contests Error:', err)
    res.status(500).json({ error: 'Failed to fetch contests' })
  }
}

// GET /contests/:id — get contest details with problems
export const getContest = async (req, res) => {
  try {
    const { id } = req.params

    const data = await dynamoDb.send(new GetCommand({
      TableName: TABLE,
      Key: { contestId: id }
    }))

    if (!data.Item) {
      return res.status(404).json({ error: 'Contest not found' })
    }

    const contest = data.Item

    // Fetch problem details
    const { getProblemById } = await import('../services/problemsData.js')
    const problems = (contest.problemIds || []).map(pid => {
      const problem = getProblemById(pid)
      if (problem) {
        return {
          id: problem.id,
          title: problem.title,
          difficulty: problem.difficulty,
          category: problem.category,
          timeLimit: problem.timeLimit
        }
      }
      return { id: pid, title: 'Unknown', difficulty: 'Unknown', category: 'Unknown' }
    })

    // Update status
    const now = new Date()
    const start = new Date(contest.startTime)
    const end = new Date(contest.endTime)
    let status = 'upcoming'
    if (now >= start && now <= end) status = 'active'
    else if (now > end) status = 'completed'

    res.json({
      ...contest,
      status,
      problems,
      participantCount: (contest.participants || []).length
    })
  } catch (err) {
    console.error('Get Contest Error:', err)
    res.status(500).json({ error: 'Failed to fetch contest' })
  }
}

// POST /contests/:id/join — join a contest
export const joinContest = async (req, res) => {
  try {
    const { id } = req.params
    const { userId, userName } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    const data = await dynamoDb.send(new GetCommand({
      TableName: TABLE,
      Key: { contestId: id }
    }))

    if (!data.Item) {
      return res.status(404).json({ error: 'Contest not found' })
    }

    const contest = data.Item
    const participants = contest.participants || []

    // Check if already joined
    if (participants.some(p => p.userId === userId)) {
      return res.status(400).json({ error: 'Already joined this contest' })
    }

    // Check if contest hasn't ended
    const now = new Date()
    const end = new Date(contest.endTime)
    if (now > end) {
      return res.status(400).json({ error: 'Contest has already ended' })
    }

    const participant = {
      userId,
      userName: userName || userId,
      joinedAt: new Date().toISOString(),
      score: 0,
      solvedProblems: [],
      totalTime: 0
    }

    participants.push(participant)

    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { contestId: id },
      UpdateExpression: 'SET participants = :participants, updatedAt = :now',
      ExpressionAttributeValues: {
        ':participants': participants,
        ':now': new Date().toISOString()
      }
    }))

    // Track contest participation for gamification badges
    try {
      const { UpdateCommand: UC } = await import('@aws-sdk/lib-dynamodb')
      await dynamoDb.send(new UC({
        TableName: 'studymate_gamification',
        Key: { userId },
        UpdateExpression: 'SET contestsJoined = if_not_exists(contestsJoined, :zero) + :one',
        ExpressionAttributeValues: { ':zero': 0, ':one': 1 }
      }))
    } catch (e) {
      // Non-critical
    }

    res.json({ success: true, message: 'Successfully joined the contest', participant })
  } catch (err) {
    console.error('Join Contest Error:', err)
    res.status(500).json({ error: 'Failed to join contest' })
  }
}

// GET /contests/:id/leaderboard — get sorted leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const { id } = req.params

    const data = await dynamoDb.send(new GetCommand({
      TableName: TABLE,
      Key: { contestId: id }
    }))

    if (!data.Item) {
      return res.status(404).json({ error: 'Contest not found' })
    }

    const participants = data.Item.participants || []

    // Sort by score (descending), then by totalTime (ascending)
    const leaderboard = participants
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return (a.totalTime || 0) - (b.totalTime || 0)
      })
      .map((p, index) => ({
        rank: index + 1,
        userId: p.userId,
        userName: p.userName,
        score: p.score,
        solvedCount: (p.solvedProblems || []).length,
        totalTime: p.totalTime,
        joinedAt: p.joinedAt
      }))

    res.json({
      contestId: id,
      contestTitle: data.Item.title,
      totalParticipants: leaderboard.length,
      leaderboard
    })
  } catch (err) {
    console.error('Leaderboard Error:', err)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
}

// Internal function — update contest score when a submission is made
export const updateContestScore = async (contestId, userId, problemId, difficulty) => {
  try {
    const data = await dynamoDb.send(new GetCommand({
      TableName: TABLE,
      Key: { contestId }
    }))

    if (!data.Item) return null

    const contest = data.Item
    const participants = contest.participants || []
    const participantIndex = participants.findIndex(p => p.userId === userId)

    if (participantIndex === -1) return null

    const participant = participants[participantIndex]

    // Don't count duplicate solves
    if ((participant.solvedProblems || []).includes(problemId)) return null

    // Calculate score based on difficulty
    const scoreMap = { Easy: 100, Medium: 200, Hard: 300 }
    const points = scoreMap[difficulty] || 100

    participant.score = (participant.score || 0) + points
    participant.solvedProblems = [...(participant.solvedProblems || []), problemId]

    // Calculate time since contest start
    const startTime = new Date(contest.startTime)
    const now = new Date()
    participant.totalTime = Math.floor((now - startTime) / 1000)

    participants[participantIndex] = participant

    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { contestId },
      UpdateExpression: 'SET participants = :participants, updatedAt = :now',
      ExpressionAttributeValues: {
        ':participants': participants,
        ':now': new Date().toISOString()
      }
    }))

    return { score: participant.score, solvedCount: participant.solvedProblems.length }
  } catch (err) {
    console.error('Update Contest Score Error:', err)
    return null
  }
}
