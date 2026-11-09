import { useSyncExternalStore, useCallback } from 'react'

// One shared theme store, so every toggle on the page stays in sync.
const listeners = new Set()
const read = () => (document.documentElement.classList.contains('light') ? 'light' : 'dark')

export function applyTheme(theme, { persistRemote = true } = {}) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  try { localStorage.setItem('theme', theme) } catch { /* storage blocked */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f7f7fb' : '#07080d')
  listeners.forEach(l => l())
  if (persistRemote) {
    // Save to the user's profile when signed in; failure only means it isn't synced across devices.
    import('../lib/api').then(({ api }) =>
      api.patch('/users/me/preferences', { theme }, { skipAuthRedirect: true }).catch(err => {
        if (err.status !== 401) console.warn('Theme preference not saved:', err.message)
      })
    )
  }
}

export function useTheme() {
  const theme = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, read, () => 'dark')
  const toggleTheme = useCallback(() => applyTheme(read() === 'dark' ? 'light' : 'dark'), [])
  return { theme, toggleTheme, setTheme: applyTheme }
}
