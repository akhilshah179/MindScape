export default function BadgeCard({ badge, earned = false, earnedAt }) {
  return (
    <div className={`relative group rounded-xl p-3 border transition-all duration-300
      ${earned
        ? 'bg-gradient-to-br from-amber-500/5 to-violet-500/5 border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5'
        : 'bg-white/[0.01] border-white/[0.04] opacity-40 grayscale hover:opacity-60'}`}>

      {/* Glow effect for earned badges */}
      {earned && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      <div className="relative flex items-center gap-3">
        <span className={`text-2xl ${earned ? 'drop-shadow-lg' : ''} group-hover:scale-110 transition-transform`}>
          {badge.icon || '🏅'}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold truncate ${earned ? 'text-white/80' : 'text-white/30'}`}>
            {badge.name}
          </p>
          <p className="text-[10px] text-white/25 truncate">{badge.description}</p>
          {earned && earnedAt && (
            <p className="text-[9px] text-amber-400/40 mt-0.5">Earned {new Date(earnedAt).toLocaleDateString()}</p>
          )}
        </div>
        {!earned && <span className="text-white/10 text-xs">🔒</span>}
      </div>
    </div>
  )
}
