import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

// Small per-user widgets (streak, study sessions, tasks, deep-work timer) keep a local copy in
// `studymate_*` localStorage keys for instant reads. This hook makes the server the source of
// truth: it restores them on login and saves changes back (periodically, on tab hide, and
// explicitly before sign-out via flushCloudSync()).
const PREFIX = 'studymate_'
const MAX_BYTES = 180_000
const flushers = new Set()

/** Save pending local changes now. Call before signing out (which wipes local keys). */
export async function flushCloudSync() {
  await Promise.all([...flushers].map(f => f()))
}

function snapshot() {
  const out = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(PREFIX)) out[k] = localStorage.getItem(k)
  }
  return out
}

export function useCloudSync(userId) {
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState(null)
  const last = useRef('')

  useEffect(() => {
    if (!userId) return
    let alive = true
    setHasLoaded(false)
    api.get('/users/me')
      .then(({ data }) => {
        if (!alive) return
        const remote = data.appState?.local
        if (remote && typeof remote === 'object') {
          // Server copy wins (also removes anything left by a previous user of this browser)
          for (const k of Object.keys(snapshot())) localStorage.removeItem(k)
          for (const [k, v] of Object.entries(remote)) if (k.startsWith(PREFIX) && typeof v === 'string') localStorage.setItem(k, v)
          window.dispatchEvent(new Event('studymate_tasks_updated'))
        }
        last.current = JSON.stringify(snapshot())
      })
      .catch(err => { if (alive) setError(err.message) })
      .finally(() => { if (alive) setHasLoaded(true) })
    return () => { alive = false }
  }, [userId])

  useEffect(() => {
    if (!userId || !hasLoaded) return
    const save = async () => {
      const data = snapshot()
      const str = JSON.stringify(data)
      if (str === last.current) return
      // Never overwrite saved data with an empty snapshot (e.g. keys wiped during sign-out).
      if (!Object.keys(data).length && last.current && last.current !== '{}') return
      if (str.length > MAX_BYTES) { console.warn('Local study data is too large to sync.'); return }
      try {
        await api.put('/users/me/state', { state: { local: data } }, { skipAuthRedirect: true })
        last.current = str
      } catch (err) {
        if (err.status !== 401) setError(err.message)
      }
    }
    flushers.add(save)
    const t = setInterval(save, 8000)
    const onHide = () => { if (document.visibilityState === 'hidden') save() }
    document.addEventListener('visibilitychange', onHide)
    return () => { flushers.delete(save); clearInterval(t); document.removeEventListener('visibilitychange', onHide) }
  }, [userId, hasLoaded])

  return { hasLoaded, error }
}
