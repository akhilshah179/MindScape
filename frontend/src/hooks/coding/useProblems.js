import { useState, useEffect, useCallback } from 'react'
import { fetchProblems, fetchProblem } from '../../services/coding/codingApi'

export function useProblems() {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ difficulty: '', category: '', search: '' })

  const loadProblems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProblems(filters)
      setProblems(data.problems || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load problems')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { loadProblems() }, [loadProblems])

  return { problems, loading, error, filters, setFilters, reload: loadProblems }
}

export function useProblem(id) {
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetchProblem(id)
      .then(data => setProblem(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load problem'))
      .finally(() => setLoading(false))
  }, [id])

  return { problem, loading, error }
}
