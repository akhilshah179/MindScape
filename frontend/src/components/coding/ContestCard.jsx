import { useState, useEffect } from 'react'

export default function ContestCard({ contest, onJoin }) {
  const [timeLeft, setTimeLeft] = useState('')
  const now = new Date()
  const start = new Date(contest.startTime)
  const end = new Date(contest.endTime)
  const isActive = now >= start && now <= end
  const isUpcoming = now < start
  const isPast = now > end

  useEffect(() => {
    if (!isUpcoming && !isActive) return

    const tick = () => {
      const target = isUpcoming ? start : end
      const diff = target - new Date()
      if (diff <= 0) { setTimeLeft('Started!'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h}h ${m}m ${s}s`)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isUpcoming, isActive])

  const statusColor = isActive ? 'emerald' : isUpcoming ? 'amber' : 'white/30'

  return (
    <div className={`bg-white/[0.02] rounded-xl p-5 border transition-all duration-300 hover:shadow-lg
      ${isActive ? 'border-emerald-500/30 hover:shadow-emerald-500/5' : 'border-white/[0.06] hover:border-white/[0.1]'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white/90">{contest.title}</h3>
          <p className="text-xs text-white/30 mt-0.5">{contest.description || 'Coding Contest'}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
          ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          isUpcoming ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
          'bg-white/[0.04] text-white/30 border border-white/[0.06]'}`}>
          {isActive ? '● Live' : isUpcoming ? 'Upcoming' : 'Ended'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-white/25 mb-4">
        <span>📅 {start.toLocaleDateString()}</span>
        <span>⏱ {contest.duration || 60}min</span>
        <span>📝 {contest.problemIds?.length || 0} problems</span>
      </div>

      {timeLeft && (isUpcoming || isActive) && (
        <div className={`text-xs font-mono mb-3 ${isActive ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isUpcoming ? 'Starts in: ' : 'Ends in: '}{timeLeft}
        </div>
      )}

      <div className="flex gap-2">
        {(isActive || isUpcoming) && onJoin && (
          <button
            onClick={() => onJoin(contest.contestId)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
              ${isActive
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20'
                : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/20'}`}
          >
            {isActive ? '▶ Enter Contest' : 'Register'}
          </button>
        )}
      </div>
    </div>
  )
}
