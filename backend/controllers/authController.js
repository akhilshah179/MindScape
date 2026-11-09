import { AUTH_PROVIDER, registerLocalUser, loginLocalUser, AuthError } from '../services/authService.js'
import { HttpError } from '../middleware/http.js'

const localOnly = () => {
  if (AUTH_PROVIDER !== 'local') throw new HttpError(404, 'Local accounts are disabled; sign in with Cognito.')
}

export const config = (req, res) => res.json({ provider: AUTH_PROVIDER })

export const register = async (req, res) => {
  localOnly()
  try {
    res.status(201).json(await registerLocalUser(req.body || {}))
  } catch (err) {
    if (err instanceof AuthError) throw new HttpError(err.status, err.message)
    throw err
  }
}

export const login = async (req, res) => {
  localOnly()
  try {
    res.json(await loginLocalUser(req.body || {}))
  } catch (err) {
    if (err instanceof AuthError) throw new HttpError(err.status, err.message)
    throw err
  }
}

export const me = (req, res) => res.json({ user: req.user })
