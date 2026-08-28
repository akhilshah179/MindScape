import { VERDICT_STYLES } from '../../services/coding/problems'

export default function OutputPanel({ runResults, submitResults, error, isRunning, isSubmitting }) {
  const results = submitResults || runResults
  const isLoading = isRunning || isSubmitting

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 bg-[#0a0a0f] rounded-xl border border-white/[0.06] p-6">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 w-10 h-10 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin" />
        </div>
        <p className="text-white/50 text-sm animate-pulse">
          {isSubmitting ? 'Running all test cases...' : 'Executing code...'}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full bg-[#0a0a0f] rounded-xl border border-red-500/20 p-4 overflow-auto">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-red-400 text-lg">✕</span>
          <h3 className="text-red-400 font-semibold text-sm">Error</h3>
        </div>
        <pre className="text-red-300/80 text-xs font-mono whitespace-pre-wrap leading-relaxed">{error}</pre>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 bg-[#0a0a0f] rounded-xl border border-white/[0.06] p-6">
        <span className="text-2xl opacity-30">▶</span>
        <p className="text-white/30 text-sm">Run your code to see output</p>
        <p className="text-white/15 text-xs">Ctrl+Enter to run • Ctrl+Shift+Enter to submit</p>
      </div>
    )
  }

  // Submission results
  if (results.totalTests !== undefined) {
    const { allPassed, totalTests, passedTests, results: testResults, verdict, timeTaken, gamification } = results
    const finalVerdict = verdict || (allPassed ? 'Accepted' : 'Failed')
    const vstyle = VERDICT_STYLES[finalVerdict] || VERDICT_STYLES['Failed']

    return (
      <div className="h-full bg-[#0a0a0f] rounded-xl border border-white/[0.06] overflow-auto">
        {/* Verdict header */}
        <div className={`px-4 py-3 border-b border-white/[0.06] flex items-center justify-between ${vstyle.bg}`}>
          <div className="flex items-center gap-2">
            <span className={`text-lg ${vstyle.text}`}>{vstyle.icon}</span>
            <span className={`font-bold text-sm ${vstyle.text}`}>{finalVerdict}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>{passedTests}/{totalTests} passed</span>
            {timeTaken && <span>{timeTaken}ms</span>}
          </div>
        </div>

        {/* Gamification reward */}
        {gamification && (
          <div className="px-4 py-2 bg-violet-500/5 border-b border-white/[0.06] flex items-center gap-2">
            <span className="text-sm">🎉</span>
            <span className="text-violet-400 text-xs font-medium">+{gamification.xpAwarded || 0} XP earned!</span>
            {gamification.newBadges?.length > 0 && (
              <span className="text-amber-400 text-xs">New badge: {gamification.newBadges[0].name}</span>
            )}
          </div>
        )}

        {/* Test case results */}
        <div className="p-4 space-y-2">
          {(testResults || []).map((tc, i) => (
            <details key={i} className={`group rounded-lg border ${tc.passed ? 'border-emerald-500/20' : 'border-red-500/20'} overflow-hidden`}>
              <summary className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/[0.02] ${tc.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{tc.passed ? '✓' : '✕'}</span>
                  <span className="text-xs font-medium">Test Case {tc.testCase}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/30">
                  {tc.time && <span>{tc.time}s</span>}
                  {tc.memory && <span>{tc.memory}KB</span>}
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </div>
              </summary>
              <div className="px-3 pb-3 space-y-2 text-xs font-mono">
                <div>
                  <p className="text-white/30 text-[10px] uppercase mb-1">Input</p>
                  <pre className="text-white/60 bg-white/[0.02] rounded px-2 py-1.5 overflow-x-auto">{tc.input}</pre>
                </div>
                <div>
                  <p className="text-white/30 text-[10px] uppercase mb-1">Expected</p>
                  <pre className="text-white/60 bg-white/[0.02] rounded px-2 py-1.5">{tc.expectedOutput}</pre>
                </div>
                {tc.actualOutput && (
                  <div>
                    <p className="text-white/30 text-[10px] uppercase mb-1">Your Output</p>
                    <pre className={`${tc.passed ? 'text-emerald-400/80' : 'text-red-400/80'} bg-white/[0.02] rounded px-2 py-1.5`}>{tc.actualOutput}</pre>
                  </div>
                )}
                {(tc.stderr || tc.compile_output) && (
                  <div>
                    <p className="text-red-400/50 text-[10px] uppercase mb-1">Error</p>
                    <pre className="text-red-300/70 bg-red-500/5 rounded px-2 py-1.5 whitespace-pre-wrap">{tc.stderr || tc.compile_output}</pre>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    )
  }

  // Single run result
  const singleResult = results
  const v = singleResult.verdict || 'Unknown'
  const vs = VERDICT_STYLES[v] || VERDICT_STYLES['Failed']

  return (
    <div className="h-full bg-[#0a0a0f] rounded-xl border border-white/[0.06] overflow-auto">
      <div className={`px-4 py-3 border-b border-white/[0.06] flex items-center gap-2 ${vs.bg}`}>
        <span className={`${vs.text}`}>{vs.icon}</span>
        <span className={`font-bold text-sm ${vs.text}`}>{v}</span>
        {singleResult.time && <span className="text-white/30 text-xs ml-auto">{singleResult.time}s</span>}
      </div>
      <div className="p-4">
        {singleResult.stdout && (
          <div className="mb-3">
            <p className="text-white/30 text-[10px] uppercase mb-1">Output</p>
            <pre className="text-emerald-300/80 text-xs font-mono bg-white/[0.02] rounded px-3 py-2">{singleResult.stdout}</pre>
          </div>
        )}
        {(singleResult.stderr || singleResult.compile_output) && (
          <div>
            <p className="text-red-400/50 text-[10px] uppercase mb-1">Error</p>
            <pre className="text-red-300/70 text-xs font-mono bg-red-500/5 rounded px-3 py-2 whitespace-pre-wrap">{singleResult.stderr || singleResult.compile_output}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
