import { useMemo } from 'react'

export default function SubmissionHeatmap({ heatmap = {} }) {
  const { weeks, maxCount } = useMemo(() => {
    const today = new Date()
    const weeks = []
    let maxCount = 0

    // Generate last 52 weeks (364 days)
    for (let w = 51; w >= 0; w--) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(today)
        date.setDate(date.getDate() - (w * 7 + (6 - d)))
        const key = date.toISOString().split('T')[0]
        const count = heatmap[key] || 0
        if (count > maxCount) maxCount = count
        week.push({ date: key, count, dayOfWeek: date.getDay() })
      }
      weeks.push(week)
    }
    return { weeks, maxCount }
  }, [heatmap])

  const getColor = (count) => {
    if (count === 0) return 'bg-white/[0.03]'
    const intensity = maxCount > 0 ? count / maxCount : 0
    if (intensity <= 0.25) return 'bg-emerald-500/20'
    if (intensity <= 0.5) return 'bg-emerald-500/40'
    if (intensity <= 0.75) return 'bg-emerald-500/60'
    return 'bg-emerald-500/90'
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const totalSubmissions = Object.values(heatmap).reduce((a, b) => a + b, 0)
  const activeDays = Object.values(heatmap).filter(v => v > 0).length

  return (
    <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/80">Submission Activity</h3>
          <p className="text-[10px] text-white/30 mt-0.5">{totalSubmissions} submissions in the last year • {activeDays} active days</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-[2px] min-w-full">
          {/* Day labels */}
          <div className="flex gap-[2px] ml-0">
            <div className="w-3" />
            {weeks.map((_, i) => {
              // Show month label at start of each month
              if (i > 0 && weeks[i]?.[0]) {
                const currMonth = new Date(weeks[i][0].date).getMonth()
                const prevMonth = new Date(weeks[i - 1]?.[0]?.date).getMonth()
                if (currMonth !== prevMonth) {
                  return <span key={i} className="text-[8px] text-white/20 w-[11px] text-center">{months[currMonth]?.charAt(0)}</span>
                }
              }
              return <span key={i} className="w-[11px]" />
            })}
          </div>

          {/* Grid */}
          {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => (
            <div key={dayIdx} className="flex gap-[2px] items-center">
              <span className="text-[8px] text-white/15 w-3 text-right">
                {dayIdx === 1 ? 'M' : dayIdx === 3 ? 'W' : dayIdx === 5 ? 'F' : ''}
              </span>
              {weeks.map((week, wIdx) => {
                const day = week.find(d => d.dayOfWeek === dayIdx)
                return (
                  <div
                    key={wIdx}
                    className={`w-[10px] h-[10px] rounded-[2px] ${day ? getColor(day.count) : 'bg-white/[0.02]'} transition-colors hover:ring-1 hover:ring-white/20`}
                    title={day ? `${day.date}: ${day.count} submission${day.count !== 1 ? 's' : ''}` : ''}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[8px] text-white/20">Less</span>
        {['bg-white/[0.03]', 'bg-emerald-500/20', 'bg-emerald-500/40', 'bg-emerald-500/60', 'bg-emerald-500/90'].map((c, i) => (
          <div key={i} className={`w-[10px] h-[10px] rounded-[2px] ${c}`} />
        ))}
        <span className="text-[8px] text-white/20">More</span>
      </div>
    </div>
  )
}
