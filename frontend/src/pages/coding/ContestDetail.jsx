import { useState, useEffect } from 'react'
import { useParams, useOutletContext, useNavigate } from 'react-router-dom'
import { useContest } from '../../hooks/coding/useContest'
import Leaderboard from '../../components/coding/Leaderboard'

export default function ContestDetail() {
  const { id } = useParams()
  const { user } = useOutletContext() || {}
  const navigate = useNavigate()
  const { contest, leaderboard, loading, loadContest, joinContest } = useContest(id)
  const [timeLeft, setTimeLeft] = useState('')
  const [joined, setJoined] = useState(false)

  useEffect(() => { loadContest() }, [loadContest])

  // Auto-refresh leaderboard
  useEffect(() => {
    if (!contest) return
    const interval = setInterval(loadContest, 30000)
    return () => clearInterval(interval)
  }, [contest, loadContest])

  // Countdown
  useEffect(() => {
    if (!contest) return
    const tick = () => {
      const end = new Date(contest.endTime)
      const diff = end - new Date()
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h}h ${m}m ${s}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [contest])

  const handleJoin = async () => {
    try {
      await joinContest({ userId: user?.userId, userName: user?.name || 'Anonymous' })
      setJoined(true)
    } catch (err) {
      console.error('Join error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!contest) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-white/30">
        <div className="text-center">
          <span className="text-3xl block mb-3">🏆</span>
          <p>Contest not found</p>
        </div>
      </div>
    )
  }

  const problems = contest.problemIds || []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent rounded-2xl p-6 border border-indigo-500/10 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{contest.title}</h1>
            <p className="text-sm text-white/30 mt-1">{contest.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-white/25">
              <span>⏱ {contest.duration || 60}min</span>
              <span>📝 {problems.length} problems</span>
              <span>👥 {leaderboard.length} participants</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono font-bold text-indigo-400">{timeLeft}</p>
            <p className="text-[10px] text-white/20">remaining</p>
          </div>
        </div>

        {!joined && (
          <button onClick={handleJoin} className="mt-4 px-6 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl text-sm font-medium border border-indigo-500/20 transition-all">
            Join Contest
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Problems */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-white/60 mb-3">Contest Problems</h2>
          {problems.map((pid, i) => (
            <button
              key={pid}
              onClick={() => navigate(`/coding/problem/${pid}`)}
              className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/[0.06] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-xs text-indigo-400 font-bold">{String.fromCharCode(65 + i)}</span>
                <span className="text-sm text-white/70">{pid}</span>
              </div>
              <span className="text-white/20 text-xs">→</span>
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <Leaderboard participants={leaderboard} currentUserId={user?.userId} />
      </div>
    </div>
  )
}
