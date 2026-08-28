import { useState } from 'react'

export default function AIHintPanel({ hints, onGetHint, loading }) {
  const [confirmLevel, setConfirmLevel] = useState(null)

  const hintLabels = [
    { level: 1, title: 'Approach Direction', desc: 'General problem-solving direction', icon: '🧭', color: 'emerald' },
    { level: 2, title: 'Algorithm Hint', desc: 'Specific data structure or algorithm', icon: '🔧', color: 'amber' },
    { level: 3, title: 'Pseudocode Guide', desc: 'Step-by-step pseudocode outline', icon: '📋', color: 'violet' },
  ]

  const handleRequest = (level) => {
    if (hints[level - 1]) return // already unlocked
    if (confirmLevel === level) {
      onGetHint?.(level)
      setConfirmLevel(null)
    } else {
      setConfirmLevel(level)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">💡</span>
        <div>
          <h3 className="text-sm font-semibold text-white/80">Progressive Hints</h3>
          <p className="text-[10px] text-white/30">Each hint reveals more. Try solving independently first!</p>
        </div>
      </div>

      {hintLabels.map(({ level, title, desc, icon, color }) => {
        const hint = hints[level - 1]
        const isLocked = !hint && level > 1 && !hints[level - 2]
        const isConfirming = confirmLevel === level

        return (
          <div key={level} className={`rounded-xl border overflow-hidden transition-all duration-300
            ${hint ? `border-${color}-500/20 bg-${color}-500/5` : 'border-white/[0.06] bg-white/[0.02]'}
            ${isLocked ? 'opacity-40' : ''}`}>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base">{icon}</span>
                <div>
                  <p className="text-xs font-semibold text-white/70">Hint {level}: {title}</p>
                  <p className="text-[10px] text-white/25">{desc}</p>
                </div>
              </div>

              {!hint && (
                <button
                  onClick={() => handleRequest(level)}
                  disabled={isLocked || loading}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all
                    ${isConfirming
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-white/[0.05] text-white/40 hover:bg-white/[0.08] hover:text-white/60 border border-white/[0.06]'}
                    ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}
                    ${loading ? 'animate-pulse' : ''}`}
                >
                  {loading && confirmLevel === level ? '...' : isConfirming ? 'Confirm? (-10 XP)' : isLocked ? '🔒 Locked' : 'Reveal'}
                </button>
              )}

              {hint && (
                <span className="text-[10px] text-emerald-400/60 px-2 py-1 bg-emerald-500/10 rounded-md">✓ Unlocked</span>
              )}
            </div>

            {hint && (
              <div className="px-4 pb-4 pt-1 border-t border-white/[0.04]">
                <p className="text-xs text-white/60 leading-relaxed whitespace-pre-line">
                  {typeof hint === 'string' ? hint : hint.hint || hint.content || JSON.stringify(hint)}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
