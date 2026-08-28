export default function DifficultyChart({ easy = 0, medium = 0, hard = 0, totalEasy = 8, totalMedium = 10, totalHard = 7 }) {
  const total = easy + medium + hard
  const totalProblems = totalEasy + totalMedium + totalHard
  const radius = 50
  const circumference = 2 * Math.PI * radius

  const segments = [
    { count: easy, total: totalEasy, color: '#10b981', label: 'Easy', pct: totalProblems > 0 ? easy / totalProblems : 0 },
    { count: medium, total: totalMedium, color: '#f59e0b', label: 'Medium', pct: totalProblems > 0 ? medium / totalProblems : 0 },
    { count: hard, total: totalHard, color: '#ef4444', label: 'Hard', pct: totalProblems > 0 ? hard / totalProblems : 0 },
  ]

  let offset = 0

  return (
    <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
      <h3 className="text-sm font-semibold text-white/80 mb-4">Difficulty Distribution</h3>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {/* Background ring */}
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />

            {/* Segments */}
            {segments.map((seg, i) => {
              const segLength = seg.pct * circumference
              const dashArray = `${segLength} ${circumference - segLength}`
              const el = (
                <circle
                  key={i}
                  cx="60" cy="60" r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeDasharray={dashArray}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                  style={{ opacity: seg.count > 0 ? 1 : 0.1 }}
                />
              )
              offset += segLength
              return el
            })}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{total}</span>
            <span className="text-[9px] text-white/30">solved</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                <span className="text-xs text-white/50">{seg.label}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-white/70">{seg.count}</span>
                <span className="text-[10px] text-white/25">/{seg.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
