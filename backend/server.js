import './config/env.js'
import express from 'express'
import cors from 'cors'

import dynamoDb, { DB_MODE } from './config/dynamoDb.js'
import { STORAGE_MODE, checkStorage } from './services/storageService.js'
import { AUTH_PROVIDER, assertAuthConfig } from './services/authService.js'
import { requireAuth } from './middleware/auth.js'
import { rateLimit } from './middleware/http.js'

import authRoutes from './routes/authRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import userRoutes from './routes/userRoutes.js'
import meetingRoutes from './routes/meetingRoutes.js'
import codingRoutes from './routes/codingRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import memoryRoutes from './routes/memoryRoutes.js'
import fileRoutes from './routes/fileRoutes.js'

// Fail fast on missing security configuration rather than running insecurely.
assertAuthConfig()

export const app = express()
app.disable('x-powered-by')
// Trust X-Forwarded-For only when explicitly deployed behind a proxy (else IPs can be spoofed for rate limits).
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY)

// ─── CORS: explicit allow-list only ──────────────────────────────────────────
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)
)
app.use(cors({
  origin: (origin, cb) => {
    // Non-browser clients (curl, server-to-server) send no Origin; auth still applies to them.
    if (!origin || allowedOrigins.has(origin)) return cb(null, true)
    cb(Object.assign(new Error(`Origin ${origin} is not allowed`), { status: 403 }))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Disposition', 'Retry-After']
}))

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})
app.use(express.json({ limit: '1mb' }))

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const checks = { db: DB_MODE, storage: STORAGE_MODE, auth: AUTH_PROVIDER }
  try {
    await checkStorage()
    res.json({ status: 'ok', ...checks, timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(503).json({ status: 'degraded', ...checks, error: `storage: ${err.message}` })
  }
})

const globalLimiter = rateLimit({ name: 'api', max: 300, windowMs: 60_000 })
app.use('/api/auth', authRoutes)
app.use('/api', requireAuth, globalLimiter)
app.use('/api/ai', rateLimit({ name: 'ai', max: 30, windowMs: 60_000 }), aiRoutes)
app.use('/api/users', userRoutes)
app.use('/api/meeting', meetingRoutes)
app.use('/api/coding', codingRoutes)
app.use('/api/chat', rateLimit({ name: 'chat', max: 40, windowMs: 60_000 }), chatRoutes)
app.use('/api/memory', memoryRoutes)
app.use('/api/files', fileRoutes)

// ─── 404 & centralized error handler ─────────────────────────────────────────
app.use('/api', (req, res) => res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.originalUrl}` }))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || (err.type === 'entity.too.large' ? 413 : 500)
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err.stack || err.message)
  if (res.headersSent) return res.end()
  // Don't leak internals on 5xx unless they are deliberate HttpErrors with a user-facing message.
  const message = status < 500 || err.name === 'HttpError' ? err.message : 'Internal server error. Please try again.'
  res.status(status).json({ success: false, error: message, ...(err.details ? { details: err.details } : {}) })
})

const PORT = Number(process.env.PORT) || 5000
if (process.env.NODE_ENV !== 'test' && !process.env.MINDSCAPE_NO_LISTEN) {
  app.listen(PORT, () => {
    console.log(`MindScape API on :${PORT} | db=${DB_MODE} storage=${STORAGE_MODE} auth=${AUTH_PROVIDER}`)
    if (STORAGE_MODE === 'local') console.warn('⚠ STORAGE_DRIVER=local: PDFs are stored on this machine\'s disk. Configure S3_BUCKET + AWS credentials for durable cloud storage.')
    if (DB_MODE === 'local') console.warn(`⚠ DB_DRIVER=local: data is stored in ${dynamoDb.file}. Back it up; use DynamoDB for production.`)
  })
}
