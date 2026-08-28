export default function StreakCounter({ current = 0, max = 0 }) {
  return (
    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/5 rounded-xl p-5 border border-orange-500/20">
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className={`text-4xl ${current > 0 ? 'animate-pulse' : 'opacity-30'}`}>🔥</span>
          {current >= 7 && (
            <span className="absolute -top-1 -right-1 text-xs animate-bounce">⚡</span>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-400">{current} <span className="text-sm font-normal text-white/30">day{current !== 1 ? 's' : ''}</span></p>
          <p className="text-[10px] text-white/25">Current Streak</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm font-semibold text-white/40">{max}</p>
          <p className="text-[10px] text-white/20">Best</p>
        </div>
      </div>

      {/* Streak progress dots */}
      <div className="flex gap-1 mt-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500
            ${i < current % 7 ? 'bg-orange-400' : 'bg-white/[0.06]'}
            ${i < current % 7 ? 'shadow-sm shadow-orange-500/30' : ''}`} />
        ))}
      </div>
      <p className="text-[9px] text-white/15 mt-1.5 text-center">{7 - (current % 7)} days until weekly milestone</p>
    </div>
  )
}
