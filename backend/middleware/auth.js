import { verifyToken, AuthError } from '../services/authService.js'

/** Requires a valid Bearer token; sets req.user = { userId, email, name }. */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
    req.user = await verifyToken(token)
    next()
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ success: false, error: err.message })
    next(err)
  }
}

/**
 * For legacy routes shaped like /:userId/...: the path id must match the token identity.
 * The token is the only proof of identity; the param is just routing.
 */
export function requireSelf(param = 'userId') {
  return (req, res, next) => {
    if (req.params[param] && req.params[param] !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden: you can only access your own data.' })
    }
    next()
  }
}
