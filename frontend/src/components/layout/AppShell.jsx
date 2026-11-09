/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, Sparkles, Code2, Video, LogOut, Settings } from 'lucide-react'
import { Avatar, Logo, cx } from '../ui'
import ThemeToggle from '../ThemeToggle'
import { useAuth } from '../../context/AuthContext'

export const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ai', label: 'StudyMate AI', icon: Sparkles },
  { to: '/coding', label: 'Coding Arena', icon: Code2 },
  { to: '/meetings', label: 'Meetings', icon: Video },
]

function UserMenu({ placement = 'right' }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  if (!user) return null
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} className="rounded-full focus-visible:ring-2 ring-accent" title={user.name}>
        <Avatar name={user.name} className="w-9 h-9" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, scale: 0.96, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}
            className={cx('absolute z-50 w-64 glass border shadow-lift rounded-2xl p-1.5', placement === 'right' ? 'left-12 bottom-0' : 'right-0 top-11')}>
            <div className="px-3 py-2.5 border-b mb-1">
              <p className="text-sm font-medium text-ink truncate">{user.name}</p>
              <p className="text-xs text-ink-3 truncate">{user.email}</p>
            </div>
            <button role="menuitem" onClick={() => { setOpen(false); navigate('/dashboard?tab=profile') }} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
              <Settings className="w-4 h-4" /> Profile & settings
            </button>
            <button role="menuitem" onClick={async () => { await signOut(); navigate('/login', { replace: true }) }} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-bad hover:bg-bad/10">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** App frame: icon rail on desktop, bottom tabs on mobile. `fullBleed` pages manage their own scroll. */
export default function AppShell({ children, fullBleed = false }) {
  return (
    <div className="h-[100dvh] flex bg-canvas text-ink overflow-hidden">
      <nav aria-label="Primary" className="hidden md:flex w-[68px] shrink-0 flex-col items-center py-4 gap-2 border-r bg-surface/60">
        <Link to="/dashboard" className="mb-4" aria-label="MindScape home"><Logo withText={false} /></Link>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} title={item.label} aria-label={item.label}
            className={({ isActive }) => cx('group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors', isActive ? 'text-ink bg-surface-2' : 'text-ink-3 hover:text-ink hover:bg-surface-2')}>
            {({ isActive }) => (<>
              {isActive && <motion.span layoutId="rail-active" className="absolute -left-[13px] w-[3px] h-6 rounded-r-full bg-accent-gradient" />}
              <item.icon className="w-[19px] h-[19px]" />
              <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-lg glass border px-2.5 py-1 text-xs text-ink opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-card z-50">{item.label}</span>
            </>)}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </nav>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b glass sticky top-0 z-30">
          <Link to="/dashboard"><Logo /></Link>
          <div className="flex items-center gap-1"><ThemeToggle /><UserMenu placement="down" /></div>
        </header>
        <div className={cx('flex-1 min-h-0 pb-16 md:pb-0', fullBleed ? 'overflow-hidden' : 'overflow-y-auto thin-scroll')}>{children}</div>
        {/* mobile tabs */}
        <nav aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 glass border-t grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cx('flex flex-col items-center justify-center gap-1 text-[10px] font-medium', isActive ? 'text-accent-ink' : 'text-ink-3')}>
              <item.icon className="w-5 h-5" />{item.label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
