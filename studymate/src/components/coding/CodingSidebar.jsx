import { NavLink, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/coding', label: 'Dashboard', icon: '📊', end: true },
  { path: '/coding/problems', label: 'Problems', icon: '💻' },
  { path: '/coding/contests', label: 'Contests', icon: '🏆' },
  { path: '/coding/interview', label: 'Interview', icon: '🎯' },
]

export default function CodingSidebar({ collapsed = false, onToggle, profile }) {
  const navigate = useNavigate()
  const level = profile?.level || 0
  const xp = profile?.xp || 0

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} transition-all duration-300 bg-[#08080d] border-r border-white/[0.06] flex flex-col h-full`}>
      {/* Logo */}
      <div className="p-4 border-b border-white/[0.06]">
        <button onClick={() => navigate('/coding')} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow shrink-0">
            {'</>'}
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white/90">Coding Arena</p>
              <p className="text-[9px] text-white/25">by StudyMate</p>
            </div>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ path, label, icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${isActive
                ? 'bg-indigo-500/10 text-indigo-400 shadow-sm shadow-indigo-500/5 border border-indigo-500/10'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent'}`}
          >
            <span className="text-base shrink-0">{icon}</span>
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Level badge */}
      {!collapsed && (
        <div className="p-3 border-t border-white/[0.06]">
          <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/5 rounded-xl p-3 border border-violet-500/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {level}
              </div>
              <div>
                <p className="text-[10px] text-white/40">Level {level}</p>
                <p className="text-[9px] text-violet-400/60">{xp} XP</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation to other products */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <button
          onClick={() => navigate('/ai')}
          className="flex items-center gap-2 px-3 py-2 text-white/25 hover:text-violet-400/70 text-xs transition-colors w-full rounded-lg hover:bg-violet-500/[0.06]"
        >
          <span>✦</span>
          {!collapsed && <span>StudyMate AI</span>}
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-3 py-2 text-white/25 hover:text-white/50 text-xs transition-colors w-full rounded-lg hover:bg-white/[0.03]"
        >
          <span>←</span>
          {!collapsed && <span>Back to Dashboard</span>}
        </button>
      </div>
    </aside>
  )
}
