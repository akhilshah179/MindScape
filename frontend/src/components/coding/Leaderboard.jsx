export default function Leaderboard({ participants = [], currentUserId }) {
  const sorted = [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (a.lastSubmitTime || 0) - (b.lastSubmitTime || 0)
  })

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">🏆 Leaderboard</h3>
        <span className="text-[10px] text-white/25">{sorted.length} participants</span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-8 text-white/20">
          <span className="text-2xl block mb-2">🏁</span>
          <p className="text-xs">No participants yet</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03]">
          {sorted.map((p, i) => {
            const isCurrentUser = p.userId === currentUserId
            return (
              <div key={p.userId || i} className={`flex items-center gap-3 px-4 py-3 transition-colors
                ${isCurrentUser ? 'bg-indigo-500/5' : 'hover:bg-white/[0.02]'}`}>
                <span className="text-sm w-6 text-center">
                  {i < 3 ? medals[i] : <span className="text-[10px] text-white/25">{i + 1}</span>}
                </span>

                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center text-[10px] text-white/50 font-semibold shrink-0">
                  {(p.userName || p.userId || '?')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isCurrentUser ? 'text-indigo-400' : 'text-white/70'}`}>
                    {p.userName || p.userId || 'Anonymous'}
                    {isCurrentUser && <span className="text-[9px] text-indigo-400/50 ml-1">(you)</span>}
                  </p>
                  <p className="text-[10px] text-white/20">
                    {p.solvedProblems?.length || 0} solved
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-white/80">{p.score || 0}</p>
                  <p className="text-[9px] text-white/20">pts</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
