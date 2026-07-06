import { useState, useCallback } from 'react'
import { fetchSubmissions } from '../../services/coding/codingApi'

export function useSubmissions(userId) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadSubmissions = useCallback(async (problemId) => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSubmissions(userId, problemId)
      setSubmissions(data.submissions || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }, [userId])

  return { submissions, loading, error, loadSubmissions }
}
