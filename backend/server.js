import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import aiRoutes from './routes/aiRoutes.js'
import userRoutes from './routes/userRoutes.js'
import meetingRoutes from './routes/meetingRoutes.js'
import codingRoutes from './routes/codingRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import memoryRoutes from './routes/memoryRoutes.js'

dotenv.config({ path: '../.env' })

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Routes
app.use('/api/ai', aiRoutes)
app.use('/api/users', userRoutes)
app.use('/api/meeting', meetingRoutes)
app.use('/api/coding', codingRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/memory', memoryRoutes)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`🚀 StudyMate Backend running securely on port ${PORT}`)
})
