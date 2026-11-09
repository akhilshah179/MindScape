import crypto from 'crypto'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDb from '../config/dynamoDb.js'
import { HttpError } from '../middleware/http.js'

const TABLE = 'studymate_meetings'
const ROOM_RE = /^[a-z0-9-]{6,32}$/
const TOKEN_TTL = '2h'

function livekitConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const url = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL
  if (!apiKey || !apiSecret || !url || apiKey.startsWith('your_')) {
    throw new HttpError(503, 'Video meetings are not configured on the server (LiveKit credentials missing).')
  }
  return { apiKey, apiSecret, url }
}

// Readable, unguessable code like "k3f9-x2qm-7hp4" (~62 bits)
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const newRoomCode = () => {
  const bytes = crypto.randomBytes(12)
  const chars = [...bytes].map(b => ALPHABET[b % ALPHABET.length]).join('')
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`
}

// POST /meeting/rooms  { title? }
export const createRoom = async (req, res) => {
  const { apiKey, apiSecret, url } = livekitConfig()
  const roomId = newRoomCode()
  const meeting = {
    roomId, hostId: req.user.userId, hostName: req.user.name,
    title: typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 100) : '',
    createdAt: new Date().toISOString()
  }
  await dynamoDb.send(new PutCommand({ TableName: TABLE, Item: meeting, ConditionExpression: 'attribute_not_exists(roomId)' }))
  try {
    const svc = new RoomServiceClient(url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'), apiKey, apiSecret)
    await svc.createRoom({ name: roomId, emptyTimeout: 10 * 60, maxParticipants: 50 })
  } catch (err) {
    // LiveKit also creates rooms on first join, so this isn't fatal — but don't hide it.
    console.warn('[meeting] LiveKit createRoom failed (room will be created on join):', err.message)
  }
  res.status(201).json({ roomId, title: meeting.title, hostId: meeting.hostId })
}

// GET /meeting/rooms/:roomId
export const getRoom = async (req, res) => {
  const roomId = String(req.params.roomId).toLowerCase()
  if (!ROOM_RE.test(roomId)) throw new HttpError(400, 'Invalid meeting code.')
  const { Item } = await dynamoDb.send(new GetCommand({ TableName: TABLE, Key: { roomId } }))
  if (!Item) throw new HttpError(404, 'Meeting not found. Check the code and try again.')
  res.json({ roomId, title: Item.title, hostName: Item.hostName, isHost: Item.hostId === req.user.userId, createdAt: Item.createdAt })
}

// POST /meeting/rooms/:roomId/token
export const generateToken = async (req, res) => {
  const { apiKey, apiSecret, url } = livekitConfig()
  const roomId = String(req.params.roomId).toLowerCase()
  if (!ROOM_RE.test(roomId)) throw new HttpError(400, 'Invalid meeting code.')
  const { Item: meeting } = await dynamoDb.send(new GetCommand({ TableName: TABLE, Key: { roomId } }))
  if (!meeting) throw new HttpError(404, 'Meeting not found. Check the code and try again.')

  const isHost = meeting.hostId === req.user.userId
  const displayName = (typeof req.body?.displayName === 'string' && req.body.displayName.trim()) || req.user.name || 'Guest'
  // Identity is the verified user id (+ a per-device suffix so the same user can join from two tabs).
  const device = crypto.randomBytes(3).toString('hex')
  const at = new AccessToken(apiKey, apiSecret, {
    identity: `${req.user.userId}#${device}`,
    name: displayName.slice(0, 60),
    ttl: TOKEN_TTL,
    metadata: JSON.stringify({ userId: req.user.userId, isHost })
  })
  at.addGrant({ room: roomId, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: isHost })
  res.json({ token: await at.toJwt(), url, roomId, isHost })
}
