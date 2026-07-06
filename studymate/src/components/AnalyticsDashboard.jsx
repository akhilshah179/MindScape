import { useEffect } from 'react'
import { useStreak, useSessions, useQuizScores } from '../hooks/useStudyTracker'

// ── Mini bar chart for last 7 days ────────────────────────────────────────────
function WeekChart({ data }) {
    const maxMins = Math.max(...data.map(d => d.mins), 1)
    return (
        <div className="flex items-end gap-2 h-24">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full relative flex items-end justify-center" style={{ height: '70px' }}>
                        <div
                            className={`w-full rounded-sm transition-all duration-500 ${d.mins > 0 ? 'bg-slate-800 dark:bg-violet-500' : 'bg-slate-100 dark:bg-white/10'
                                }`}
                            style={{ height: `${Math.max((d.mins / maxMins) * 70, d.mins > 0 ? 4 : 2)}px` }}
                            title={`${d.mins} min`}
                        />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-white/50 font-medium uppercase tracking-wider">{d.label}</span>
                </div>
            ))}
        </div>
    )
}

// ── Streak card ─────────────────────────────────────────────────────────
function StreakCard({ streak }) {
    const isActiveToday = streak.lastDate === new Date().toISOString().slice(0, 10)
    return (
        <div className="rounded-lg p-5 border bg-white dark:bg-[#06060a] border-slate-200 dark:border-white/10 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-white/60 font-semibold uppercase tracking-wider">Study Streak</span>
                <span className="text-lg opacity-80">{isActiveToday ? '🔥' : '⏸️'}</span>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {streak.count}<span className="text-sm font-normal text-slate-500 dark:text-white/50 ml-1.5">days</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-white/50">
                {isActiveToday ? 'Active today' : 'Open a subject to continue'}
            </p>
            {streak.longestStreak > 0 && (
                <p className="text-xs text-slate-600 dark:text-white/60 font-medium mt-1">Best: <span className="text-slate-900 dark:text-white">{streak.longestStreak} days</span></p>
            )}
        </div>
    )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon }) {
    return (
        <div className="rounded-lg p-5 border bg-white dark:bg-[#06060a] border-slate-200 dark:border-white/10 flex flex-col gap-2 shadow-sm">
            <div className="flex items-start justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">{label}</span>
                <span className="text-lg opacity-80">{icon}</span>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500 dark:text-white/50">{sub}</p>
        </div>
    )
}

// ── Subject performance row ───────────────────────────────────────────────────
function SubjectRow({ subjectName, entries }) {
    const avgPct = Math.round(entries.reduce((a, e) => a + e.pct, 0) / entries.length)
    const best = Math.max(...entries.map(e => e.pct))
    const attempts = entries.length
    
    // Sober colors mapping
    const barColor = avgPct >= 80 ? 'bg-slate-800 dark:bg-violet-500' : avgPct >= 60 ? 'bg-slate-500 dark:bg-violet-400/50' : 'bg-slate-300 dark:bg-white/10'

    return (
        <div className="bg-white dark:bg-[#06060a] rounded-lg border border-slate-200 dark:border-white/10 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-slate-900 dark:text-white text-sm font-medium">{subjectName}</p>
                    <p className="text-slate-500 dark:text-white/50 text-xs mt-0.5">{attempts} attempt{attempts !== 1 ? 's' : ''} · Best: {best}%</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white/90">
                    {avgPct}% avg
                </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5">
                <div className={`${barColor} h-1.5 rounded-full transition-all duration-700`}
                    style={{ width: `${avgPct}%` }} />
            </div>
            {/* Last 5 attempts sparkline dots */}
            <div className="flex items-center gap-1.5 mt-3">
                {entries.slice(-5).map((e, i) => (
                    <div key={i} title={`${e.pct}% on ${e.date}`}
                        className={`w-1.5 h-1.5 rounded-full ${e.pct >= 80 ? 'bg-slate-800 dark:bg-violet-500' : e.pct >= 60 ? 'bg-slate-500 dark:bg-violet-400/50' : 'bg-slate-300 dark:bg-white/10'}`} />
                ))}
                <span className="text-[10px] text-slate-400 dark:text-white/40 ml-1.5 uppercase tracking-wider font-medium">recent</span>
            </div>
        </div>
    )
}

// ── Spaced repetition: weak topics ───────────────────────────────────────────
function WeakTopics({ weakTopics }) {
    if (!weakTopics.length) return (
        <div className="text-center py-6 text-slate-400 dark:text-white/40 border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
            <p className="text-sm">No weak spots identified yet.</p>
        </div>
    )

    return (
        <ul className="space-y-2">
            {weakTopics.map(({ topic, count }, i) => (
                <li key={i} className="flex items-center gap-3 bg-white dark:bg-[#06060a] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 shadow-sm hover:border-slate-300 dark:hover:border-white/30 transition-colors">
                    <span className="text-slate-400 dark:text-white/40 font-medium text-xs shrink-0 w-4">
                        {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-slate-800 dark:text-white text-sm font-medium truncate" title={topic}>
                            {topic}
                        </p>
                    </div>
                    <span className="text-slate-400 dark:text-white/60 text-xs whitespace-nowrap bg-slate-50 dark:bg-white/5 px-2 py-1 rounded border border-slate-100 dark:border-white/10">
                        Missed {count}x
                    </span>
                </li>
            ))}
        </ul>
    )
}

// ── Main Analytics Dashboard ──────────────────────────────────────────────────
export default function AnalyticsDashboard() {
    const { streak, tickStreak } = useStreak()
    const { totalMinutes, last7 } = useSessions()
    const { scores, bySubject, weakTopics } = useQuizScores()

    // Tick streak on mount
    useEffect(() => { tickStreak() }, [])

    const totalQuizzes = scores.length
    const avgScore = totalQuizzes
        ? Math.round(scores.reduce((a, s) => a + s.pct, 0) / totalQuizzes)
        : 0
    const todayMins = last7.find(d => d.date === new Date().toISOString().slice(0, 10))?.mins || 0

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-8 font-sans animate-fade-in">
            
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Analytics Overview</h2>
                <p className="text-sm text-slate-500 dark:text-white/60 mt-1">Monitor your learning progress and performance metrics.</p>
            </div>

            {/* ── Top stats row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StreakCard streak={streak} />
                <StatCard label="Today" value={`${todayMins}m`} sub="Time studied today" icon="⏱️" />
                <StatCard label="Total Time" value={`${totalMinutes}m`} sub="All recorded sessions" icon="📅" />
                <StatCard label="Avg Score" value={totalQuizzes ? `${avgScore}%` : '—'}
                    sub={`Across ${totalQuizzes} assessment${totalQuizzes !== 1 ? 's' : ''}`} icon="🧠" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                {/* ── Study time chart ── */}
                <div className="bg-white dark:bg-[#06060a] rounded-lg border border-slate-200 dark:border-white/10 shadow-sm p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-slate-900 dark:text-white font-medium text-sm">Study Time Activity</h3>
                            <p className="text-slate-500 dark:text-white/50 text-xs mt-1">Minutes per day (Trailing 7 days)</p>
                        </div>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-white/80 bg-slate-50 dark:bg-white/5 px-2.5 py-1 rounded shadow-sm border border-slate-200 dark:border-white/10">
                            {last7.reduce((a, d) => a + d.mins, 0)} min total
                        </span>
                    </div>
                    <WeekChart data={last7} />
                </div>

                {/* ── Subject performance ── */}
                <div className="bg-white dark:bg-[#06060a] rounded-lg border border-slate-200 dark:border-white/10 shadow-sm p-6 overflow-hidden flex flex-col h-full">
                    <h3 className="text-slate-900 dark:text-white font-medium text-sm mb-1">Performance by Subject</h3>
                    <p className="text-slate-500 dark:text-white/50 text-xs mb-5">Aggregated quiz metrics</p>
                    
                    <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[160px]">
                        {Object.keys(bySubject).length === 0 ? (
                            <div className="border border-dashed border-slate-200 dark:border-white/10 rounded-lg p-6 text-center text-slate-400 dark:text-white/40 mt-2">
                                <p className="text-sm">No assessment data available.</p>
                            </div>
                        ) : (
                            Object.entries(bySubject)
                                .sort((a, b) => {
                                    const avgA = a[1].reduce((s, e) => s + e.pct, 0) / a[1].length
                                    const avgB = b[1].reduce((s, e) => s + e.pct, 0) / b[1].length
                                    return avgA - avgB
                                })
                                .map(([name, entries]) => (
                                    <SubjectRow key={name} subjectName={name} entries={entries} />
                                ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                {/* ── Spaced repetition ── */}
                <div className="bg-white dark:bg-[#06060a] rounded-lg border border-slate-200 dark:border-white/10 shadow-sm p-6">
                    <div className="mb-5">
                        <h3 className="text-slate-900 dark:text-white font-medium text-sm">Focus Areas</h3>
                        <p className="text-slate-500 dark:text-white/50 text-xs mt-1">Frequently missed topics requiring review</p>
                    </div>
                    <WeakTopics weakTopics={weakTopics} />
                </div>

                {/* ── Recent quiz history ── */}
                <div className="bg-white dark:bg-[#06060a] rounded-lg border border-slate-200 dark:border-white/10 shadow-sm p-6 flex flex-col">
                    <h3 className="text-slate-900 dark:text-white font-medium text-sm mb-1">Recent History</h3>
                    <p className="text-slate-500 dark:text-white/50 text-xs mb-5">Latest assessments completed</p>
                    
                    {scores.length === 0 ? (
                        <div className="border border-dashed border-slate-200 dark:border-white/10 rounded-lg p-6 text-center text-slate-400 dark:text-white/40 mt-2">
                            <p className="text-sm">No assessments taken yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
                            {[...scores].reverse().slice(0, 20).map((s) => (
                                <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-white/10 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 rounded px-2 transition-colors">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.pct >= 80 ? 'bg-slate-800 dark:bg-violet-500' : s.pct >= 60 ? 'bg-slate-500 dark:bg-violet-400/50' : 'bg-slate-300 dark:bg-white/10'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-800 dark:text-white text-sm font-medium truncate">{s.subjectName}</p>
                                        <p className="text-slate-500 dark:text-white/50 text-[10px] truncate uppercase tracking-wider mt-0.5">{s.fileName} · {s.date}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-white bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded shadow-sm shrink-0">
                                        {s.score}/{s.total}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
