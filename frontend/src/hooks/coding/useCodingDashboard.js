import { useState, useEffect, useCallback } from 'react'
import { fetchDashboard } from '../../services/coding/codingApi'

export function useCodingDashboard(userId) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await fetchDashboard(userId)
      setDashboard(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard')
      // Return empty dashboard structure on error
      setDashboard({
        profile: { xp: 0, level: 0, totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, currentStreak: 0, maxStreak: 0, badges: [], languageUsage: {}, heatmap: {} },
        stats: { totalSubmissions: 0, acceptedSubmissions: 0, acceptanceRate: 0 },
        recentSubmissions: []
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  return { dashboard, loading, error, reload: loadDashboard }
}
