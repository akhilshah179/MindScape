export default function AIReviewPanel({ reviewResult, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-lg">🤖</span>
        </div>
        <p className="text-white/40 text-sm animate-pulse">Analyzing your code...</p>
      </div>
    )
  }

  if (!reviewResult) {
    return (
      <div className="text-center py-12 text-white/25">
        <span className="text-3xl block mb-3">🔍</span>
        <p className="text-sm">Submit your code to get an AI review</p>
        <p className="text-xs mt-1">Complexity analysis, quality score, and optimization tips</p>
      </div>
    )
  }

  const { timeComplexity, spaceComplexity, codeQuality, optimizationSuggestions, alternativeApproaches } = reviewResult

  return (
    <div className="space-y-4 overflow-auto max-h-[500px] custom-scrollbar">
      {/* Complexity Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 rounded-xl p-4 border border-indigo-500/20">
          <p className="text-[10px] uppercase tracking-wider text-indigo-300/50 mb-1">Time Complexity</p>
          <p className="text-lg font-bold text-indigo-300 font-mono">{timeComplexity || 'N/A'}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-xl p-4 border border-cyan-500/20">
          <p className="text-[10px] uppercase tracking-wider text-cyan-300/50 mb-1">Space Complexity</p>
          <p className="text-lg font-bold text-cyan-300 font-mono">{spaceComplexity || 'N/A'}</p>
        </div>
      </div>

      {/* Quality Score */}
      {codeQuality !== undefined && (
        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-white/50">Code Quality</p>
            <span className={`text-lg font-bold ${codeQuality >= 8 ? 'text-emerald-400' : codeQuality >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
              {codeQuality}/10
            </span>
          </div>
          <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${codeQuality >= 8 ? 'bg-emerald-500' : codeQuality >= 5 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${codeQuality * 10}%` }}
            />
          </div>
        </div>
      )}

      {/* Optimization Suggestions */}
      {optimizationSuggestions?.length > 0 && (
        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
          <h3 className="text-xs font-semibold text-amber-400/80 mb-3 flex items-center gap-2">
            <span>⚡</span> Optimization Suggestions
          </h3>
          <ul className="space-y-2">
            {optimizationSuggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60 leading-relaxed">
                <span className="text-amber-400/40 mt-0.5 shrink-0">→</span>
                <span>{typeof s === 'string' ? s : s.suggestion || JSON.stringify(s)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternative Approaches */}
      {alternativeApproaches?.length > 0 && (
        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
          <h3 className="text-xs font-semibold text-violet-400/80 mb-3 flex items-center gap-2">
            <span>💡</span> Alternative Approaches
          </h3>
          <ul className="space-y-2">
            {alternativeApproaches.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60 leading-relaxed">
                <span className="text-violet-400/40 shrink-0">{i + 1}.</span>
                <span>{typeof a === 'string' ? a : a.approach || JSON.stringify(a)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
