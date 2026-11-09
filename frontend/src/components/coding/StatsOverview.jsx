export default function StatsOverview({ profile = {}, stats = {} }) {
  const cards = [
    { label: 'Problems Solved', value: profile.totalSolved || 0, icon: '🏆', color: 'from-emerald-500/10 to-emerald-500/5', accent: 'text-emerald-400' },
    { label: 'Success Rate', value: `${stats.acceptanceRate || 0}%`, icon: '🎯', color: 'from-indigo-500/10 to-indigo-500/5', accent: 'text-indigo-400' },
    { label: 'Current Streak', value: `${profile.currentStreak || 0}d`, icon: '🔥', color: 'from-orange-500/10 to-orange-500/5', accent: 'text-orange-400' },
    { label: 'Total XP', value: profile.xp || 0, icon: '⚡', color: 'from-violet-500/10 to-violet-500/5', accent: 'text-violet-400' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon, color, accent }) => (
        <div key={label} className={`bg-gradient-to-br ${color} rounded-xl p-4 border border-white/[0.06] hover:border-white/[0.1] transition-all group`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">{label}</span>
            <span className="text-base group-hover:scale-110 transition-transform">{icon}</span>
          </div>
          <p className={`text-2xl font-bold ${accent}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}
