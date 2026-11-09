// User profile, preferences, synced app state, and quiz score history.
import { GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDb from '../config/dynamoDb.js'
import { HttpError } from '../middleware/http.js'

const T_USERS = 'studymate_users'
const T_SCORES = 'studymate_scores'
const MAX_STATE_BYTES = 200_000
const ALLOWED_PREFS = new Set(['theme', 'language', 'dailyGoalMinutes', 'reducedMotion', 'defaultCodeLanguage', 'notifications', 'subjects'])

// GET /users/me
export const getProfile = async (req, res) => {
  const { Item } = await dynamoDb.send(new GetCommand({ TableName: T_USERS, Key: { userId: req.user.userId } }))
  res.json({
    userId: req.user.userId, email: req.user.email, name: req.user.name,
    preferences: Item?.preferences || {}, appState: Item?.appState || null, updatedAt: Item?.updatedAt || null
  })
}

// PATCH /users/me/preferences  { theme?, ... }
export const updatePreferences = async (req, res) => {
  const prefs = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => ALLOWED_PREFS.has(k)))
  if (!Object.keys(prefs).length) throw new HttpError(400, `Allowed preferences: ${[...ALLOWED_PREFS].join(', ')}`)
  if (prefs.theme !== undefined && !['light', 'dark'].includes(prefs.theme)) throw new HttpError(400, 'theme must be "light" or "dark".')
  if (prefs.subjects !== undefined) {
    if (!Array.isArray(prefs.subjects) || prefs.subjects.length > 40) throw new HttpError(400, 'subjects must be an array of at most 40 items.')
    prefs.subjects = prefs.subjects.map(s => ({
      name: String(s?.name || '').trim().slice(0, 60),
      color: String(s?.color || 'violet').replace(/[^a-z-]/g, '').slice(0, 20)
    })).filter(s => s.name)
    if (new Set(prefs.subjects.map(s => s.name.toLowerCase())).size !== prefs.subjects.length) throw new HttpError(400, 'Subject names must be unique.')
  }
  await dynamoDb.send(new UpdateCommand({
    TableName: T_USERS, Key: { userId: req.user.userId },
    UpdateExpression: 'SET preferences = if_not_exists(preferences, :e), updatedAt = :now',
    ExpressionAttributeValues: { ':e': {}, ':now': new Date().toISOString() }
  }))
  const names = {}, vals = { ':now': new Date().toISOString() }
  const sets = Object.entries(prefs).map(([k, v], i) => { names[`#k${i}`] = k; vals[`:v${i}`] = v; return `preferences.#k${i} = :v${i}` })
  const { Attributes } = await dynamoDb.send(new UpdateCommand({
    TableName: T_USERS, Key: { userId: req.user.userId },
    UpdateExpression: `SET ${sets.join(', ')}, updatedAt = :now`, ExpressionAttributeNames: names, ExpressionAttributeValues: vals, ReturnValues: 'ALL_NEW'
  }))
  res.json({ success: true, preferences: Attributes.preferences })
}

// PUT /users/me/state  { state }  — study tracker / notes / dashboard widgets
export const syncAppState = async (req, res) => {
  const state = req.body?.state
  if (state === undefined || typeof state !== 'object') throw new HttpError(400, 'state must be an object.')
  if (Buffer.byteLength(JSON.stringify(state)) > MAX_STATE_BYTES) throw new HttpError(413, 'App state is too large.')
  const now = new Date().toISOString()
  await dynamoDb.send(new UpdateCommand({
    TableName: T_USERS, Key: { userId: req.user.userId },
    UpdateExpression: 'SET appState = :s, updatedAt = :now', ExpressionAttributeValues: { ':s': state, ':now': now }
  }))
  res.json({ success: true, updatedAt: now })
}

// GET /users/me/scores
export const getQuizScores = async (req, res) => {
  const { Items = [] } = await dynamoDb.send(new QueryCommand({
    TableName: T_SCORES, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': req.user.userId }, ScanIndexForward: false
  }))
  res.json(Items)
}
