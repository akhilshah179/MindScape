import { useState, useCallback, useEffect } from 'react'
import { fetchContests, fetchContest, createContest, joinContest, fetchLeaderboard } from '../../services/coding/codingApi'

export function useContests() {
  const [contests, setContests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadContests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchContests()
      setContests(data.contests || data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCreate = useCallback(async (data) => {
    const result = await createContest(data)
    await loadContests()
    return result
  }, [loadContests])

  return { contests, loading, error, loadContests, createContest: handleCreate }
}

export function useContest(contestId) {
  const [contest, setContest] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadContest = useCallback(async ({ quiet = false } = {}) => {
    if (!contestId) return
    if (!quiet) setLoading(true)
    try {
      const [c, lb] = await Promise.all([fetchContest(contestId), fetchLeaderboard(contestId)])
      setContest(c)
      setLeaderboard(lb.leaderboard || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [contestId])

  useEffect(() => { loadContest() }, [loadContest])

  const handleJoin = useCallback(async () => {
    await joinContest(contestId)
    await loadContest({ quiet: true })
  }, [contestId, loadContest])

  return { contest, leaderboard, loading, error, loadContest, joinContest: handleJoin }
}
