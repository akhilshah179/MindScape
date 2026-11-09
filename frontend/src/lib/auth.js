// Client-side session management. The backend verifies every token; nothing here is trusted
// by the server. Provider is chosen with VITE_AUTH_PROVIDER ("local" | "cognito").
export const AUTH_PROVIDER = (import.meta.env.VITE_AUTH_PROVIDER || 'local').toLowerCase()
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
const SESSION_KEY = 'mindscape_session'

const listeners = new Set()
export const onAuthChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
const emit = (user) => listeners.forEach(fn => { try { fn(user) } catch { /* listener errors are theirs */ } })

let amplifyAuth = null
async function cognito() {
  if (!amplifyAuth) {
    await import('../aws/config.js')
    amplifyAuth = await import('aws-amplify/auth')
  }
  return amplifyAuth
}

function readLocal() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (!s?.token) return null
    const payload = JSON.parse(atob(s.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.exp || payload.exp * 1000 < Date.now() + 5000) { localStorage.removeItem(SESSION_KEY); return null }
    return s
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

async function post(path, body) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new Error('Cannot reach the MindScape server. Please check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status })
  return data
}

/** Current bearer token, or null if signed out / expired. */
export async function getToken() {
  if (AUTH_PROVIDER === 'cognito') {
    try {
      const { fetchAuthSession } = await cognito()
      return (await fetchAuthSession()).tokens?.idToken?.toString() || null
    } catch { return null }
  }
  return readLocal()?.token || null
}

/** { userId, name, email } for the signed-in user. Throws if signed out. */
export async function getAuthUser() {
  if (AUTH_PROVIDER === 'cognito') {
    const { getCurrentUser, fetchUserAttributes } = await cognito()
    const u = await getCurrentUser()
    const attrs = await fetchUserAttributes().catch(() => ({}))
    return { userId: u.userId, email: attrs.email || u.username, name: attrs.name || attrs.email?.split('@')[0] || 'User' }
  }
  const s = readLocal()
  if (!s) throw new Error('Not signed in')
  return s.user
}

/** Returns { user } on success or { nextStep: 'CONFIRM_SIGN_UP' } for unverified Cognito users. */
export async function signIn(email, password) {
  if (AUTH_PROVIDER === 'cognito') {
    const { signIn: cSignIn, signOut: cSignOut } = await cognito()
    await cSignOut().catch(() => {})
    const res = await cSignIn({ username: email, password })
    if (res.nextStep?.signInStep === 'CONFIRM_SIGN_UP') return { nextStep: 'CONFIRM_SIGN_UP' }
    if (!res.isSignedIn) throw new Error(`Additional sign-in step required: ${res.nextStep?.signInStep}`)
    const user = await getAuthUser()
    emit(user)
    return { user }
  }
  const { token, user } = await post('/auth/login', { email, password })
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }))
  emit(user)
  return { user }
}

/** Returns { user } (signed in) or { nextStep: 'CONFIRM_SIGN_UP' } when email verification is needed. */
export async function signUp({ name, email, password }) {
  if (AUTH_PROVIDER === 'cognito') {
    const { signUp: cSignUp } = await cognito()
    const res = await cSignUp({ username: email, password, options: { userAttributes: { email, name } } })
    if (res.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') return { nextStep: 'CONFIRM_SIGN_UP' }
    return signIn(email, password)
  }
  const { token, user } = await post('/auth/register', { name, email, password })
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }))
  emit(user)
  return { user }
}

export async function confirmSignUp(email, code) {
  if (AUTH_PROVIDER !== 'cognito') throw new Error('Email verification is only used with Cognito accounts.')
  const { confirmSignUp: c } = await cognito()
  await c({ username: email, confirmationCode: code })
}

export async function resendSignUpCode(email) {
  if (AUTH_PROVIDER !== 'cognito') return
  const { resendSignUpCode: r } = await cognito()
  await r({ username: email })
}

/** Signs out and wipes per-user data cached in this browser (so the next user can't see it). */
export async function signOut() {
  if (AUTH_PROVIDER === 'cognito') {
    try { const { signOut: s } = await cognito(); await s() } catch { /* already signed out */ }
  }
  localStorage.removeItem(SESSION_KEY)
  clearUserCache()
  emit(null)
}

export function clearUserCache() {
  const doomed = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && (k.startsWith('studymate_') || k.startsWith('mindscape_cache'))) doomed.push(k)
  }
  doomed.forEach(k => localStorage.removeItem(k))
}
