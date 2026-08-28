import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { getAuthUser } from '../../utils/auth'
import CodingSidebar from '../../components/coding/CodingSidebar'

export default function CodingArena() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await getAuthUser()
        setUser({
          userId: u.userId,
          name: u.name,
          email: u.email,
        })
      } catch (err) {
        console.error('Failed to load user:', err)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-xl border-2 border-indigo-500/20 animate-pulse" />
            <div className="absolute inset-0 rounded-xl border-2 border-transparent border-t-indigo-500 animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-indigo-400">{'</>'}</span>
          </div>
          <p className="text-white/30 text-sm">Loading Coding Arena...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <CodingSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      </div>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
          <div className="w-56 h-full" onClick={e => e.stopPropagation()}>
            <CodingSidebar collapsed={false} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#08080d] border-b border-white/[0.06]">
          <button onClick={() => setMobileNavOpen(true)} className="text-white/50 hover:text-white/70 text-xl">☰</button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[8px] font-bold">{'</>'}</div>
            <span className="text-sm font-semibold text-white/80">Coding Arena</span>
          </div>
          <div className="w-6" />
        </div>

        <Outlet context={{ user }} />
      </main>
    </div>
  )
}
