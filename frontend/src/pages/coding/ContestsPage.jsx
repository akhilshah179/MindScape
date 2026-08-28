import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useContests } from '../../hooks/coding/useContest'
import ContestCard from '../../components/coding/ContestCard'

export default function ContestsPage() {
  const { user } = useOutletContext() || {}
  const { contests, loading, loadContests, createContest } = useContests()
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState('active')
  const [form, setForm] = useState({ title: '', description: '', problemIds: '', duration: 60 })

  useEffect(() => { loadContests() }, [])

  const now = new Date()
  const activeContests = contests.filter(c => new Date(c.startTime) <= now && new Date(c.endTime) >= now)
  const upcomingContests = contests.filter(c => new Date(c.startTime) > now)
  const pastContests = contests.filter(c => new Date(c.endTime) < now)
  const filtered = tab === 'active' ? activeContests : tab === 'upcoming' ? upcomingContests : pastContests

  const handleCreate = async (e) => {
    e.preventDefault()
    const start = new Date()
    start.setHours(start.getHours() + 1)
    const end = new Date(start.getTime() + form.duration * 60000)

    try {
      await createContest({
        title: form.title,
        description: form.description,
        problemIds: form.problemIds.split(',').map(s => s.trim()).filter(Boolean),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: parseInt(form.duration),
        createdBy: user?.userId
      })
      setShowCreate(false)
      setForm({ title: '', description: '', problemIds: '', duration: 60 })
    } catch (err) {
      console.error('Create contest error:', err)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Contests</h1>
          <p className="text-sm text-white/30 mt-1">Compete with others in timed coding challenges</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl text-xs font-medium border border-indigo-500/20 transition-all"
        >
          + Create Contest
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 bg-white/[0.02] rounded-xl p-1 border border-white/[0.06] w-fit">
        {[
          { id: 'active', label: `Active (${activeContests.length})` },
          { id: 'upcoming', label: `Upcoming (${upcomingContests.length})` },
          { id: 'past', label: `Past (${pastContests.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all
              ${tab === t.id ? 'bg-white/[0.06] text-white/80' : 'text-white/30 hover:text-white/50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contest list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <span className="text-3xl block mb-3">🏆</span>
          <p className="text-sm">No {tab} contests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(c => (
            <ContestCard key={c.contestId} contest={c} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#12121a] rounded-2xl w-full max-w-md p-6 border border-white/[0.08]" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Create Contest</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input type="text" placeholder="Contest Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/30" />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/30 resize-none h-20" />
              <input type="text" placeholder="Problem IDs (comma-separated)" value={form.problemIds} onChange={e => setForm(f => ({ ...f, problemIds: e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/30" />
              <input type="number" placeholder="Duration (minutes)" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/30" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/40 rounded-xl text-xs font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl text-xs font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
