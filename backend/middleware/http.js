// Shared HTTP helpers: async error forwarding, typed errors, rate limiting.

export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.name = 'HttpError'; this.status = status; this.details = details }
}

/** Wrap an async handler so rejections reach the central error handler instead of hanging. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

/**
 * Fixed-window rate limiter. Keyed by authenticated user when available, otherwise IP.
 * In-memory: correct for a single backend instance. Use a shared store if you scale out.
 */
export function rateLimit({ max, windowMs = 60_000, name = 'default', keyFn }) {
  const hits = new Map()
  setInterval(() => {
    const now = Date.now()
    for (const [k, r] of hits) if (now > r.reset) hits.delete(k)
  }, windowMs).unref()
  return (req, res, next) => {
    const id = keyFn ? keyFn(req) : (req.user?.userId || req.ip)
    const key = `${name}:${id}`
    const now = Date.now()
    let r = hits.get(key)
    if (!r || now > r.reset) { r = { count: 0, reset: now + windowMs }; hits.set(key, r) }
    r.count++
    res.setHeader('RateLimit-Limit', max)
    res.setHeader('RateLimit-Remaining', Math.max(0, max - r.count))
    if (r.count > max) {
      res.setHeader('Retry-After', Math.ceil((r.reset - now) / 1000))
      return res.status(429).json({ success: false, error: 'Too many requests. Please slow down and try again shortly.' })
    }
    next()
  }
}

/** Validate that body fields are strings within a max length. Returns trimmed values. */
export function requireString(value, field, { max = 10_000, min = 1 } = {}) {
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be a string.`)
  const v = value.trim()
  if (v.length < min) throw new HttpError(400, `${field} is required.`)
  if (v.length > max) throw new HttpError(400, `${field} is too long (max ${max} characters).`)
  return v
}
