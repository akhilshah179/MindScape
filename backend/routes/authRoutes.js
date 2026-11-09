import express from 'express'
import { config, register, login, me } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, rateLimit } from '../middleware/http.js'

const router = express.Router()
// Brute-force protection: per IP+email for login, per IP for registration.
const loginLimiter = rateLimit({ name: 'login', max: 10, windowMs: 15 * 60_000, keyFn: (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase()}` })
const registerLimiter = rateLimit({ name: 'register', max: 5, windowMs: 60 * 60_000, keyFn: (req) => req.ip })

router.get('/config', config)
router.post('/register', registerLimiter, asyncHandler(register))
router.post('/login', loginLimiter, asyncHandler(login))
router.get('/me', requireAuth, me)
export default router
