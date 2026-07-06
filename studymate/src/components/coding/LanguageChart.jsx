const LANG_COLORS = {
  cpp: { color: '#60a5fa', icon: '⚙️', name: 'C++' },
  java: { color: '#f59e0b', icon: '☕', name: 'Java' },
  python: { color: '#34d399', icon: '🐍', name: 'Python' },
  javascript: { color: '#fbbf24', icon: '🟨', name: 'JavaScript' },
}

export default function LanguageChart({ languageUsage = {} }) {
  const entries = Object.entries(languageUsage)
    .map(([lang, count]) => ({ lang, count, ...(LANG_COLORS[lang] || { color: '#94a3b8', icon: '📄', name: lang }) }))
    .sort((a, b) => b.count - a.count)

  const maxCount = Math.max(...entries.map(e => e.count), 1)
  const total = entries.reduce((acc, e) => acc + e.count, 0)

  return (
    <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
      <h3 className="text-sm font-semibold text-white/80 mb-4">Language Usage</h3>

      {entries.length === 0 ? (
        <div className="text-center py-6 text-white/20">
          <span className="text-2xl block mb-2">🌐</span>
          <p className="text-xs">No language data yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(({ lang, count, color, icon, name }) => (
            <div key={lang} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/50">{count}</span>
                  <span className="text-[10px] text-white/20">({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
