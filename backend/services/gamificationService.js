import dynamoDb from '../config/dynamoDb.js'
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { withLock } from './lock.js'
import { problems as ALL_PROBLEMS } from './problemsData.js'

const TABLE = 'studymate_gamification'
export const XP_REWARDS = { Easy: 50, Medium: 100, Hard: 200 }
const FAST_SOLVE_SECONDS = 5 * 60

const countBy = (d) => ALL_PROBLEMS.filter(p => p.difficulty === d).length

export const BADGES = [
  { id: 'first-blood', name: 'First Blood', description: 'Solve your first problem', icon: '🗡️', condition: (p) => p.totalSolved >= 1 },
  { id: 'ten-down', name: 'Ten Down', description: 'Solve 10 problems', icon: '🔟', condition: (p) => p.totalSolved >= 10 },
  { id: 'half-century', name: 'Half Century', description: 'Solve 50 problems', icon: '🏏', condition: (p) => p.totalSolved >= 50 },
  { id: 'centurion', name: 'Centurion', description: 'Solve 100 problems', icon: '💯', condition: (p) => p.totalSolved >= 100 },
  { id: 'easy-master', name: 'Easy Master', description: 'Solve all Easy problems', icon: '🟢', condition: (p) => p.easySolved >= countBy('Easy') },
  { id: 'medium-master', name: 'Medium Master', description: 'Solve all Medium problems', icon: '🟡', condition: (p) => p.mediumSolved >= countBy('Medium') },
  { id: 'hard-master', name: 'Hard Master', description: 'Solve all Hard problems', icon: '🔴', condition: (p) => p.hardSolved >= countBy('Hard') },
  { id: 'streak-3', name: 'On Fire', description: '3 day streak', icon: '🔥', condition: (p) => p.maxStreak >= 3 },
  { id: 'streak-7', name: 'Week Warrior', description: '7 day streak', icon: '⚡', condition: (p) => p.maxStreak >= 7 },
  { id: 'streak-30', name: 'Monthly Monster', description: '30 day streak', icon: '👑', condition: (p) => p.maxStreak >= 30 },
  { id: 'polyglot', name: 'Polyglot', description: 'Solve problems in all 4 languages', icon: '🌐', condition: (p) => Object.keys(p.languageUsage || {}).length >= 4 },
  { id: 'speed-demon', name: 'Speed Demon', description: 'Solve a problem within 5 minutes of opening it', icon: '⏱️', condition: (p) => p.fastSolve === true },
  { id: 'contest-warrior', name: 'Contest Warrior', description: 'Participate in 5 contests', icon: '🏆', condition: (p) => (p.contestsJoined || 0) >= 5 },
  { id: 'bug-hunter', name: 'Bug Hunter', description: 'Use AI debugger 10 times', icon: '🐛', condition: (p) => (p.debugUses || 0) >= 10 },
  { id: 'level-10', name: 'Deca Level', description: 'Reach Level 10', icon: '🌟', condition: (p) => p.level >= 10 }
]

export const calculateLevel = (xp) => Math.floor(Math.sqrt((xp || 0) / 100))
export const xpForLevel = (level) => level * level * 100
const today = () => new Date().toISOString().slice(0, 10)

const createDefaultProfile = (userId) => ({
  userId, xp: 0, level: 0, totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0,
  currentStreak: 0, maxStreak: 0, lastActiveDate: null, badges: [], languageUsage: {}, heatmap: {},
  solvedProblems: [], problemFirstSeen: {}, fastSolve: false, contestsJoined: 0, debugUses: 0, xpHistory: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
})

/** Load (creating if needed) a profile. Legacy profiles get solvedProblems backfilled from submissions. */
export async function getProfile(userId) {
  const { Item } = await dynamoDb.send(new GetCommand({ TableName: TABLE, Key: { userId } }))
  if (!Item) {
    const profile = createDefaultProfile(userId)
    try {
      await dynamoDb.send(new PutCommand({ TableName: TABLE, Item: profile, ConditionExpression: 'attribute_not_exists(userId)' }))
      return profile
    } catch (err) {
      if (err.name !== 'ConditionalCheckFailedException') throw err
      return (await dynamoDb.send(new GetCommand({ TableName: TABLE, Key: { userId } }))).Item
    }
  }
  if (!Array.isArray(Item.solvedProblems) || !Item.problemFirstSeen) {
    const subs = await dynamoDb.send(new QueryCommand({
      TableName: 'studymate_submissions', KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': userId }
    }))
    const solved = [...new Set((subs.Items || []).filter(s => s.verdict === 'Accepted').map(s => s.problemId))]
    const { Attributes } = await dynamoDb.send(new UpdateCommand({
      TableName: TABLE, Key: { userId },
      UpdateExpression: 'SET solvedProblems = if_not_exists(solvedProblems, :s), problemFirstSeen = if_not_exists(problemFirstSeen, :e)',
      ExpressionAttributeValues: { ':s': solved, ':e': {} }, ReturnValues: 'ALL_NEW'
    }))
    return Attributes
  }
  return Item
}

/** Server-side record of when the user first worked on a problem (for the speed badge). */
export async function markProblemAttempt(userId, problemId) {
  await getProfile(userId)
  await dynamoDb.send(new UpdateCommand({
    TableName: TABLE, Key: { userId },
    UpdateExpression: 'SET problemFirstSeen.#p = if_not_exists(problemFirstSeen.#p, :now)',
    ExpressionAttributeNames: { '#p': problemId },
    ExpressionAttributeValues: { ':now': new Date().toISOString() }
  }))
}

function nextStreak(profile, day) {
  const last = profile.lastActiveDate
  if (last === day) return { currentStreak: profile.currentStreak || 1, maxStreak: profile.maxStreak || 1 }
  const diff = last ? Math.round((new Date(day) - new Date(last)) / 86400000) : null
  const currentStreak = diff === 1 ? (profile.currentStreak || 0) + 1 : 1
  return { currentStreak, maxStreak: Math.max(profile.maxStreak || 0, currentStreak) }
}

async function awardNewBadges(userId, profile) {
  const have = new Set((profile.badges || []).map(b => b.id))
  const now = new Date().toISOString()
  const earned = BADGES.filter(b => !have.has(b.id) && b.condition(profile))
    .map(b => ({ id: b.id, name: b.name, description: b.description, icon: b.icon, earnedAt: now }))
  if (earned.length) {
    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE, Key: { userId },
      UpdateExpression: 'SET badges = list_append(if_not_exists(badges, :e), :b), updatedAt = :now',
      ExpressionAttributeValues: { ':e': [], ':b': earned, ':now': now }
    }))
  }
  return earned
}

/**
 * Apply all rewards for an Accepted submission in one serialized step.
 * XP / solve counts are awarded only the FIRST time a problem is solved; the conditional
 * write makes that hold even with concurrent submissions.
 */
export function recordAcceptedSubmission(userId, problem, language) {
  return withLock(`gamification:${userId}`, async () => {
    const profile = await getProfile(userId)
    const day = today()
    const nowIso = new Date().toISOString()
    const firstSolve = !(profile.solvedProblems || []).includes(problem.id)
    const xpAwarded = firstSolve ? (XP_REWARDS[problem.difficulty] || 50) : 0
    const streak = nextStreak(profile, day)
    const diffKey = `${problem.difficulty.toLowerCase()}Solved`
    const firstSeen = profile.problemFirstSeen?.[problem.id]
    const fast = firstSolve && firstSeen && (Date.now() - new Date(firstSeen)) / 1000 <= FAST_SOLVE_SECONDS

    // Ensure parent maps exist first (DynamoDB can't SET a nested path under a missing map)
    await dynamoDb.send(new UpdateCommand({
      TableName: TABLE, Key: { userId },
      UpdateExpression: 'SET heatmap = if_not_exists(heatmap, :m), languageUsage = if_not_exists(languageUsage, :m)',
      ExpressionAttributeValues: { ':m': {} }
    }))
    const sets = [
      'currentStreak = :cs', 'maxStreak = :ms', 'lastActiveDate = :day', 'updatedAt = :now',
      'heatmap.#day = if_not_exists(heatmap.#day, :zero) + :one',
      'languageUsage.#lang = if_not_exists(languageUsage.#lang, :zero) + :one'
    ]
    const values = { ':cs': streak.currentStreak, ':ms': streak.maxStreak, ':day': day, ':now': nowIso, ':zero': 0, ':one': 1 }
    const names = { '#day': day, '#lang': language }

    let condition
    if (firstSolve) {
      const newXP = (profile.xp || 0) + xpAwarded
      sets.push(
        'xp = if_not_exists(xp, :zero) + :xp', '#lvl = :lvl',
        'totalSolved = if_not_exists(totalSolved, :zero) + :one',
        `${diffKey} = if_not_exists(${diffKey}, :zero) + :one`,
        'solvedProblems = list_append(if_not_exists(solvedProblems, :emptyList), :pidList)',
        'xpHistory = list_append(if_not_exists(xpHistory, :emptyList), :hist)'
      )
      Object.assign(values, {
        ':xp': xpAwarded, ':lvl': calculateLevel(newXP), ':emptyList': [], ':pidList': [problem.id], ':pid': problem.id,
        ':hist': [{ amount: xpAwarded, reason: `Solved ${problem.title}`, problemId: problem.id, difficulty: problem.difficulty, language, date: day, timestamp: nowIso }]
      })
      if (fast) { sets.push('fastSolve = :true'); values[':true'] = true }
      names['#lvl'] = 'level'
      condition = 'NOT contains(solvedProblems, :pid)'
    }

    let updated
    try {
      updated = (await dynamoDb.send(new UpdateCommand({
        TableName: TABLE, Key: { userId }, UpdateExpression: 'SET ' + sets.join(', '),
        ConditionExpression: condition, ExpressionAttributeNames: names, ExpressionAttributeValues: values, ReturnValues: 'ALL_NEW'
      }))).Attributes
    } catch (err) {
      if (err.name !== 'ConditionalCheckFailedException') throw err
      // Another process recorded this solve first: no XP, just return current state.
      updated = await getProfile(userId)
      return { xpAwarded: 0, firstSolve: false, totalXP: updated.xp, level: updated.level, previousLevel: updated.level, leveledUp: false, newBadges: [], streak }
    }

    const newBadges = await awardNewBadges(userId, updated)
    return {
      xpAwarded,
      firstSolve,
      totalXP: updated.xp || 0,
      level: updated.level || 0,
      previousLevel: profile.level || 0,
      leveledUp: (updated.level || 0) > (profile.level || 0),
      newBadges,
      streak
    }
  })
}

/** Increment a counter (debugUses, contestsJoined) and evaluate badges. */
export function incrementCounter(userId, field) {
  if (!['debugUses', 'contestsJoined'].includes(field)) throw new Error(`Unknown counter ${field}`)
  return withLock(`gamification:${userId}`, async () => {
    await getProfile(userId)
    const { Attributes } = await dynamoDb.send(new UpdateCommand({
      TableName: TABLE, Key: { userId },
      UpdateExpression: `SET ${field} = if_not_exists(${field}, :z) + :one, updatedAt = :now`,
      ExpressionAttributeValues: { ':z': 0, ':one': 1, ':now': new Date().toISOString() }, ReturnValues: 'ALL_NEW'
    }))
    return awardNewBadges(userId, Attributes)
  })
}

export const getAllBadges = () => BADGES.map(({ id, name, description, icon }) => ({ id, name, description, icon }))

/** Public view of a profile (drops internal bookkeeping). */
export function publicProfile(p) {
  const { problemFirstSeen, ...rest } = p
  return { ...rest, nextLevelXP: xpForLevel((p.level || 0) + 1), currentLevelXP: xpForLevel(p.level || 0) }
}
