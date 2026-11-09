// Authentication. Identity is ONLY ever derived from a verified token, never from
// client-supplied ids. Two providers, chosen explicitly with AUTH_PROVIDER:
//   cognito -> verifies AWS Cognito RS256 JWTs (id or access tokens) against the pool's JWKS
//   local   -> built-in accounts: scrypt password hashes + HS256 tokens signed with JWT_SECRET
import '../config/env.js'
import crypto from 'crypto'
import axios from 'axios'
import dynamoDb from '../config/dynamoDb.js'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

export const AUTH_PROVIDER = (process.env.AUTH_PROVIDER || 'local').toLowerCase()
const USERS_TABLE = 'studymate_auth_users'
const TOKEN_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS) || 7 * 24 * 3600

export class AuthError extends Error {
  constructor(message, status = 401) { super(message); this.status = status }
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')
const fromB64url = (s) => Buffer.from(s, 'base64url')

function getJwtSecret() {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters when AUTH_PROVIDER=local.')
  }
  return s
}

// ─── Local provider ─────────────────────────────────────────────────────────────
// Matches the id scheme the app used before real auth existed, so existing user data stays attached.
export const userIdFromEmail = (email) => email.replace(/[^a-zA-Z0-9]/g, '_')
const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function hashPassword(password, salt = crypto.randomBytes(16)) {
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

function verifyPassword(password, stored) {
  const [alg, saltB64, hashB64] = String(stored || '').split('$')
  if (alg !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 })
  return crypto.timingSafeEqual(expected, actual)
}

export function signLocalToken(user) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub: user.userId, email: user.email, name: user.name, iat: now, exp: now + TOKEN_TTL_SECONDS, iss: 'mindscape-local' }
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(data).digest()
  return `${data}.${b64url(sig)}`
}

function verifyLocalToken(token) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new AuthError('Malformed token')
  const [h, p, s] = parts
  const header = JSON.parse(fromB64url(h).toString())
  if (header.alg !== 'HS256') throw new AuthError('Unsupported token algorithm')
  const expected = crypto.createHmac('sha256', getJwtSecret()).update(`${h}.${p}`).digest()
  const given = fromB64url(s)
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw new AuthError('Invalid token signature')
  const payload = JSON.parse(fromB64url(p).toString())
  if (payload.iss !== 'mindscape-local') throw new AuthError('Invalid token issuer')
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new AuthError('Session expired. Please log in again.')
  return { userId: payload.sub, email: payload.email, name: payload.name }
}

const publicUser = (u) => ({ userId: u.userId, email: u.email, name: u.name })

export async function registerLocalUser({ email, password, name }) {
  email = normalizeEmail(email)
  if (!EMAIL_RE.test(email)) throw new AuthError('Please enter a valid email address.', 400)
  if (typeof password !== 'string' || password.length < 8) throw new AuthError('Password must be at least 8 characters.', 400)
  if (password.length > 256) throw new AuthError('Password is too long.', 400)
  const user = {
    email,
    userId: userIdFromEmail(email),
    name: String(name || '').trim().slice(0, 80) || email.split('@')[0],
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  }
  try {
    await dynamoDb.send(new PutCommand({ TableName: USERS_TABLE, Item: user, ConditionExpression: 'attribute_not_exists(email)' }))
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') throw new AuthError('An account with this email already exists.', 409)
    throw err
  }
  return { user: publicUser(user), token: signLocalToken(user) }
}

// Hash of a random password; used so unknown emails cost the same time as wrong passwords.
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'))

export async function loginLocalUser({ email, password }) {
  email = normalizeEmail(email)
  if (!email || typeof password !== 'string') throw new AuthError('Email and password are required.', 400)
  const { Item } = await dynamoDb.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }))
  const ok = verifyPassword(password, Item?.passwordHash || DUMMY_HASH)
  if (!Item || !ok) throw new AuthError('Incorrect email or password.')
  return { user: publicUser(Item), token: signLocalToken(Item) }
}

// ─── Cognito provider ───────────────────────────────────────────────────────────
const COGNITO_REGION = process.env.COGNITO_REGION || process.env.AWS_REGION || 'ap-south-1'
const COGNITO_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.VITE_USER_POOL_ID
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || process.env.VITE_USER_POOL_CLIENT_ID
const COGNITO_ISSUER = COGNITO_POOL_ID ? `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_POOL_ID}` : null

let jwksCache = { keys: new Map(), fetchedAt: 0 }
async function getCognitoKey(kid) {
  const fresh = Date.now() - jwksCache.fetchedAt < 6 * 3600 * 1000
  if (!fresh || !jwksCache.keys.has(kid)) {
    const { data } = await axios.get(`${COGNITO_ISSUER}/.well-known/jwks.json`, { timeout: 5000 })
    jwksCache = { keys: new Map(data.keys.map(k => [k.kid, crypto.createPublicKey({ key: k, format: 'jwk' })])), fetchedAt: Date.now() }
  }
  const key = jwksCache.keys.get(kid)
  if (!key) throw new AuthError('Unknown token signing key')
  return key
}

async function verifyCognitoToken(token) {
  if (!COGNITO_ISSUER || !COGNITO_CLIENT_ID) throw new Error('AUTH_PROVIDER=cognito requires COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.')
  const parts = token.split('.')
  if (parts.length !== 3) throw new AuthError('Malformed token')
  const [h, p, s] = parts
  const header = JSON.parse(fromB64url(h).toString())
  if (header.alg !== 'RS256') throw new AuthError('Unsupported token algorithm')
  const key = await getCognitoKey(header.kid)
  const valid = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), key, fromB64url(s))
  if (!valid) throw new AuthError('Invalid token signature')
  const payload = JSON.parse(fromB64url(p).toString())
  if (payload.iss !== COGNITO_ISSUER) throw new AuthError('Invalid token issuer')
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new AuthError('Session expired. Please log in again.')
  if (payload.token_use === 'id' && payload.aud !== COGNITO_CLIENT_ID) throw new AuthError('Token audience mismatch')
  if (payload.token_use === 'access' && payload.client_id !== COGNITO_CLIENT_ID) throw new AuthError('Token client mismatch')
  if (!['id', 'access'].includes(payload.token_use)) throw new AuthError('Invalid token use')
  return {
    userId: payload.sub,
    email: payload.email || payload.username || '',
    name: payload.name || payload.email?.split('@')[0] || 'User'
  }
}

export async function verifyToken(token) {
  if (!token) throw new AuthError('Authentication required.')
  try {
    return AUTH_PROVIDER === 'cognito' ? await verifyCognitoToken(token) : verifyLocalToken(token)
  } catch (err) {
    if (err instanceof AuthError) throw err
    if (err instanceof SyntaxError) throw new AuthError('Malformed token')
    throw err
  }
}

export function assertAuthConfig() {
  if (AUTH_PROVIDER === 'local') getJwtSecret()
  else if (AUTH_PROVIDER === 'cognito') {
    if (!COGNITO_ISSUER || !COGNITO_CLIENT_ID) throw new Error('AUTH_PROVIDER=cognito requires COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.')
  } else throw new Error(`Unknown AUTH_PROVIDER "${AUTH_PROVIDER}" (expected "local" or "cognito")`)
}
