export default function AIDebugPanel({ debugResult, loading, onDebug }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-lg">🐛</span>
        </div>
        <p className="text-white/40 text-sm animate-pulse">Analyzing your code for bugs...</p>
      </div>
    )
  }

  if (!debugResult) {
    return (
      <div className="text-center py-12 text-white/25">
        <span className="text-3xl block mb-3">🐛</span>
        <p className="text-sm">AI Debugger</p>
        <p className="text-xs mt-1 mb-4">Get AI-powered analysis of errors in your code</p>
        {onDebug && (
          <button
            onClick={onDebug}
            className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium border border-orange-500/20 transition-all"
          >
            🔍 Debug My Code
          </button>
        )}
      </div>
    )
  }

  const problems = debugResult.problems || debugResult.issues || []
  const errorType = debugResult.errorType || 'Analysis'

  return (
    <div className="space-y-4 overflow-auto max-h-[500px] custom-scrollbar">
      {/* Error type badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/5 rounded-lg border border-orange-500/20">
        <span className="text-base">
          {errorType === 'Syntax' ? '🔧' : errorType === 'Runtime' ? '💥' : '🧠'}
        </span>
        <div>
          <p className="text-xs font-semibold text-orange-400">{errorType} Error Detected</p>
          <p className="text-[10px] text-white/30">{problems.length} issue{problems.length !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      {/* Issue cards */}
      {problems.map((p, i) => (
        <div key={i} className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
          {/* Problem */}
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-red-400 text-xs">●</span>
              <p className="text-xs font-semibold text-red-400">Problem</p>
              {p.line && <span className="text-[10px] text-white/20 ml-auto">Line {p.line}</span>}
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{p.issue || p.problem || 'Unknown issue'}</p>
          </div>

          {/* Reason */}
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 text-xs">●</span>
              <p className="text-xs font-semibold text-amber-400">Reason</p>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{p.reason || 'Analysis not available'}</p>
          </div>

          {/* Fix */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-400 text-xs">●</span>
              <p className="text-xs font-semibold text-emerald-400">Fix</p>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{p.fix || 'No fix suggested'}</p>
          </div>
        </div>
      ))}

      {/* Debug again */}
      {onDebug && (
        <button
          onClick={onDebug}
          className="w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-white/40 hover:text-white/60 rounded-lg text-xs font-medium border border-white/[0.06] transition-all"
        >
          🔄 Re-analyze Code
        </button>
      )}
    </div>
  )
}
