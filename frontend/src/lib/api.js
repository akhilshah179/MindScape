// Single HTTP client for the MindScape API. Adds the bearer token, normalises errors
// into readable messages, and sends the user to /login when the session expires.
import axios from 'axios'
import { getToken, signOut } from './auth'

export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')

export const api = axios.create({ baseURL: API_BASE, timeout: 120_000 })

api.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let redirecting = false
export async function handleUnauthorized() {
  if (redirecting) return
  redirecting = true
  await signOut()
  const here = window.location.pathname + window.location.search
  if (!here.startsWith('/login')) window.location.assign(`/login?next=${encodeURIComponent(here)}&expired=1`)
}

export function toApiError(err) {
  if (axios.isCancel?.(err) || err?.name === 'CanceledError' || err?.name === 'AbortError') {
    return Object.assign(new Error('Request cancelled'), { cancelled: true })
  }
  const status = err?.response?.status
  let message = err?.response?.data?.error
  if (!message) {
    if (err?.code === 'ECONNABORTED') message = 'The request timed out. Please try again.'
    else if (!err?.response) message = 'Cannot reach the MindScape server. Is it running?'
    else message = err.message || 'Something went wrong.'
  }
  // keep .response for older components that read err.response.data.error
  return Object.assign(new Error(message), { status, response: err?.response })
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !err.config?.skipAuthRedirect) handleUnauthorized()
    return Promise.reject(toApiError(err))
  }
)

/** fetch() with auth, for streaming responses. */
export async function authFetch(path, init = {}) {
  const token = await getToken()
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw Object.assign(new Error('Request cancelled'), { cancelled: true })
    throw new Error('Cannot reach the MindScape server. Is it running?')
  }
  if (res.status === 401) { handleUnauthorized(); throw Object.assign(new Error('Your session expired. Please log in again.'), { status: 401 }) }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status })
  }
  return res
}

/**
 * POST and consume a Server-Sent Events stream. Calls onToken(text) for each `token` event;
 * resolves with the `done` payload; rejects on `error` events.
 */
export async function streamPost(path, body, { onToken, signal } = {}) {
  const res = await authFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal
  })
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let done = null
  try {
    for (;;) {
      const { value, done: finished } = await reader.read()
      if (finished) break
      buf += decoder.decode(value, { stream: true })
      let sep
      while ((sep = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, sep)
        buf = buf.slice(sep + 2)
        const event = /^event: (.*)$/m.exec(block)?.[1]
        const dataLine = /^data: (.*)$/m.exec(block)?.[1]
        if (!event || !dataLine) continue
        const data = JSON.parse(dataLine)
        if (event === 'token') onToken?.(data.t)
        else if (event === 'done') done = data
        else if (event === 'error') throw new Error(data.error || 'The AI request failed.')
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw Object.assign(new Error('Request cancelled'), { cancelled: true })
    throw err
  }
  if (!done) throw new Error('The response ended unexpectedly. Please try again.')
  return done
}
