import { VERDICT_STYLES } from '../../services/coding/problems'

export default function SubmissionHistory({ submissions, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!submissions?.length) {
    return (
      <div className="text-center py-8 text-white/30">
        <span className="text-2xl block mb-2">📝</span>
        <p className="text-sm">No submissions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 overflow-auto max-h-[400px] custom-scrollbar">
      {submissions.map((sub, i) => {
        const vs = VERDICT_STYLES[sub.verdict] || VERDICT_STYLES['Failed']
        return (
          <div key={sub.submissionId || i} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-3">
              <span className={`${vs.text} text-sm`}>{vs.icon}</span>
              <div>
                <p className={`text-xs font-semibold ${vs.text}`}>{sub.verdict}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{sub.language} • {new Date(sub.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-white/30">
              {sub.passedTests !== undefined && <span>{sub.passedTests}/{sub.totalTests}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
