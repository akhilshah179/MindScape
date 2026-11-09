import { useState, useEffect, useCallback } from 'react'
import { fetchGamification } from '../../services/coding/codingApi'

export function useGamification(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProfile = useCallback(async () => {

    setLoading(true)
    try {
      const data = await fetchGamification(userId)
      setProfile(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load gamification')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadProfile() }, [loadProfile])

  return { profile, loading, error, reload: loadProfile }
}
