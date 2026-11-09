import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, ListTree, Mic2, Trophy, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { fetchGamification } from '../../services/coding/codingApi'
import { cx } from '../../components/ui'

const NAV = [
  { to: '/coding', label: 'Overview', icon: BarChart3, end: true },
  { to: '/coding/problems', label: 'Problems', icon: ListTree },
  { to: '/coding/contests', label: 'Contests', icon: Trophy },
  { to: '/coding/interview', label: 'Interview prep', icon: Mic2 },
]

/** Coding Arena uses the dark palette everywhere (editor-style workspace). */
export default function CodingArena() {
  const { user } = useAuth()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const inWorkspace = /^\/coding\/problem\//.test(location.pathname)

  const refreshProfile = () => fetchGamification().then(setProfile).catch(() => {})
  useEffect(() => { refreshProfile() }, [])

  const pct = profile ? Math.min(100, Math.round(((profile.xp - profile.currentLevelXP) / Math.max(1, profile.nextLevelXP - profile.currentLevelXP)) * 100)) : 0

  return (
    <div className="theme-dark h-full flex flex-col bg-canvas text-ink">
      {!inWorkspace && (
        <div className="shrink-0 border-b bg-surface/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
            <nav className="flex items-center gap-1 overflow-x-auto thin-scroll flex-1" aria-label="Coding Arena">
              {NAV.map(n => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm whitespace-nowrap transition-colors', isActive ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink hover:bg-surface-2')}>
                  <n.icon className="w-4 h-4" />{n.label}
                </NavLink>
              ))}
            </nav>
            {profile && (
              <div className="hidden sm:flex items-center gap-3 shrink-0" title={`${profile.xp} XP · ${profile.nextLevelXP - profile.xp} XP to level ${profile.level + 1}`}>
                <span className="w-8 h-8 rounded-lg bg-accent-gradient text-white text-xs font-bold flex items-center justify-center shadow-glow">{profile.level}</span>
                <div className="w-28">
                  <div className="flex justify-between text-[10px] text-ink-3"><span className="inline-flex items-center gap-1"><Zap className="w-3 h-3 text-warn" />{profile.xp} XP</span><span>Lv {profile.level + 1}</span></div>
                  <div className="h-1.5 rounded-full bg-surface-3 mt-1 overflow-hidden"><div className="h-full bg-accent-gradient" style={{ width: `${pct}%` }} /></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className={cx('flex-1 min-h-0', inWorkspace ? 'overflow-hidden' : 'overflow-y-auto thin-scroll')}>
        <Outlet context={{ user, profile, refreshProfile }} />
      </div>
    </div>
  )
}
