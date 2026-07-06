import { DIFFICULTY_COLORS } from '../../services/coding/problems'

export default function ProblemDescription({ problem }) {
  if (!problem) return null

  const diff = DIFFICULTY_COLORS[problem.difficulty] || DIFFICULTY_COLORS.Easy

  return (
    <div className="h-full overflow-auto custom-scrollbar">
      {/* Title & difficulty */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold text-white">{problem.title}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${diff.bg} ${diff.text} ${diff.border} border`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/30">
          <span className="px-2 py-0.5 bg-white/[0.04] rounded-md">{problem.category}</span>
          {problem.timeLimit && <span>⏱ {problem.timeLimit / 1000}s limit</span>}
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <div className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
          {problem.description}
        </div>
      </div>

      {/* Examples */}
      {problem.examples?.length > 0 && (
        <div className="mb-6 space-y-4">
          {problem.examples.map((ex, i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
              <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2">
                <span className="text-indigo-400 text-xs font-semibold">Example {i + 1}</span>
              </div>
              <div className="p-4 space-y-3 text-sm font-mono">
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Input</p>
                  <pre className="text-cyan-300/80 text-xs">{ex.input}</pre>
                </div>
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Output</p>
                  <pre className="text-emerald-300/80 text-xs">{ex.output}</pre>
                </div>
                {ex.explanation && (
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Explanation</p>
                    <p className="text-white/50 text-xs font-sans">{ex.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Constraints */}
      {problem.constraints?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white/60 mb-3">Constraints</h3>
          <ul className="space-y-1.5">
            {problem.constraints.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/50">
                <span className="text-indigo-400/60 mt-0.5">•</span>
                <code className="text-amber-300/70 font-mono">{c}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
