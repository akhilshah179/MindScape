import { useState, useCallback } from 'react'
import { fetchSubmissions } from '../../services/coding/codingApi'

export function useSubmissions() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const loadSubmissions = useCallback(async (problemId) => {
    setLoading(true)
    setError(null)
    try {
      setSubmissions((await fetchSubmissions(null, problemId)).submissions || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])
  return { submissions, loading, error, loadSubmissions }
}
