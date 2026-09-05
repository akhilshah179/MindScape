import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import aiRoutes from './routes/aiRoutes.js'
import userRoutes from './routes/userRoutes.js'
import meetingRoutes from './routes/meetingRoutes.js'
import codingRoutes from './routes/codingRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import memoryRoutes from './routes/memoryRoutes.js'
import fileRoutes from './routes/fileRoutes.js'

dotenv.config({ path: '../.env' })
dotenv.config()

const app = express()

// ─── 1. CORS Configuration ──────────────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o))) {
            callback(null, true)
        } else {
            callback(null, true) // Permissive fallback for development
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ─── 2. Lightweight Rate Limiting for Heavy Endpoints ────────────────────────
const rateLimitMap = new Map()
function createRateLimiter(maxRequests = 40, windowMs = 60000) {
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
        const key = `${ip}:${req.baseUrl || req.path}`
        const now = Date.now()

        const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs }

        if (now > record.resetTime) {
            record.count = 1
            record.resetTime = now + windowMs
        } else {
            record.count++
        }

        rateLimitMap.set(key, record)

        if (record.count > maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests. Please slow down and try again shortly.'
            })
        }

        next()
    }
}

// Cleanup rate limiter map every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) rateLimitMap.delete(key)
    }
}, 300000)

// ─── 3. Health & Routes ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MindScape AI Student OS'
}))

// Apply rate limiting on AI and heavy compute endpoints
app.use('/api/ai', createRateLimiter(60, 60000), aiRoutes)
app.use('/api/users', userRoutes)
app.use('/api/meeting', meetingRoutes)
app.use('/api/coding', createRateLimiter(80, 60000), codingRoutes)
app.use('/api/chat', createRateLimiter(60, 60000), chatRoutes)
app.use('/api/memory', memoryRoutes)
app.use('/api/files', createRateLimiter(60, 60000), fileRoutes)

// ─── 4. 404 & Centralized Error Handler ──────────────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.originalUrl}` })
})

app.use((err, req, res, next) => {
    console.error('Unhandled Backend Error:', err.stack || err.message)
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error occurred.'
    })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`🚀 StudyMate Backend running securely on port ${PORT}`)
})

