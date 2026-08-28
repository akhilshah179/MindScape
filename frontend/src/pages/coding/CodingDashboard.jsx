import { useOutletContext } from 'react-router-dom'
import { useCodingDashboard } from '../../hooks/coding/useCodingDashboard'
import StatsOverview from '../../components/coding/StatsOverview'
import SubmissionHeatmap from '../../components/coding/SubmissionHeatmap'
import DifficultyChart from '../../components/coding/DifficultyChart'
import LanguageChart from '../../components/coding/LanguageChart'
import StreakCounter from '../../components/coding/StreakCounter'
import GamificationPanel from '../../components/coding/GamificationPanel'
import { VERDICT_STYLES } from '../../services/coding/problems'

export default function CodingDashboard() {
  const { user } = useOutletContext() || {}
  const { dashboard, loading } = useCodingDashboard(user?.userId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-white/30 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const profile = dashboard?.profile || {}
  const stats = dashboard?.stats || {}
  const recentSubmissions = dashboard?.recentSubmissions || []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/30 mt-1">Track your coding progress and achievements</p>
      </div>

      {/* Stats Row */}
      <StatsOverview profile={profile} stats={stats} />

      {/* Row: Streak + Difficulty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StreakCounter current={profile.currentStreak} max={profile.maxStreak} />
        <DifficultyChart easy={profile.easySolved} medium={profile.mediumSolved} hard={profile.hardSolved} />
      </div>

      {/* Heatmap */}
      <SubmissionHeatmap heatmap={profile.heatmap} />

      {/* Row: Language + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LanguageChart languageUsage={profile.languageUsage} />

        {/* Recent Submissions */}
        <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Recent Submissions</h3>
          {recentSubmissions.length === 0 ? (
            <div className="text-center py-6 text-white/20">
              <span className="text-2xl block mb-2">📝</span>
              <p className="text-xs">No submissions yet. Start solving!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.slice(0, 5).map((sub, i) => {
                const vs = VERDICT_STYLES[sub.verdict] || VERDICT_STYLES['Failed']
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs ${vs.text}`}>{vs.icon}</span>
                      <p className="text-xs text-white/60 truncate">{sub.problemTitle || sub.problemId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium ${vs.text}`}>{sub.verdict}</span>
                      <span className="text-[9px] text-white/15">{sub.language}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Gamification */}
      <GamificationPanel profile={profile} />
    </div>
  )
}
