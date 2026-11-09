/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getAuthUser, onAuthChange, signOut as doSignOut } from '../lib/auth'
import { api } from '../lib/api'
import { applyTheme } from '../hooks/useTheme'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | authed | anon
  const [preferences, setPreferences] = useState({})

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me', { skipAuthRedirect: true })
      setPreferences(data.preferences || {})
      if (data.preferences?.theme) applyTheme(data.preferences.theme, { persistRemote: false })
    } catch (err) {
      if (err.status !== 401) console.warn('Could not load profile:', err.message)
    }
  }, [])

  useEffect(() => {
    let alive = true
    getAuthUser()
      .then(u => { if (alive) { setUser(u); setStatus('authed'); loadProfile() } })
      .catch(() => { if (alive) setStatus('anon') })
    const off = onAuthChange(u => {
      setUser(u)
      setStatus(u ? 'authed' : 'anon')
      if (u) loadProfile(); else setPreferences({})
    })
    return () => { alive = false; off() }
  }, [loadProfile])

  const updatePreferences = useCallback(async (patch) => {
    setPreferences(p => ({ ...p, ...patch }))
    const { data } = await api.patch('/users/me/preferences', patch)
    setPreferences(data.preferences)
    return data.preferences
  }, [])

  const value = useMemo(() => ({
    user, status, preferences, updatePreferences,
    signOut: async () => {
      // Save local study data before sign-out wipes it from this browser.
      await import('../hooks/useCloudSync').then(m => m.flushCloudSync()).catch(() => {})
      await doSignOut()
    }
  }), [user, status, preferences, updatePreferences])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
