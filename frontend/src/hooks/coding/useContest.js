import { useState, useCallback } from 'react'
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
      setError(err.response?.data?.error || 'Failed to load contests')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCreate = useCallback(async (data) => {
    try {
      const result = await createContest(data)
      await loadContests()
      return result
    } catch (err) {
      throw err
    }
  }, [loadContests])

  return { contests, loading, error, loadContests, createContest: handleCreate }
}

export function useContest(contestId) {
  const [contest, setContest] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  const loadContest = useCallback(async () => {
    if (!contestId) return
    setLoading(true)
    try {
      const [contestData, lbData] = await Promise.all([
        fetchContest(contestId),
        fetchLeaderboard(contestId).catch(() => ({ participants: [] }))
      ])
      setContest(contestData)
      setLeaderboard(lbData.participants || lbData || [])
    } catch (err) {
      console.error('Load contest error:', err)
    } finally {
      setLoading(false)
    }
  }, [contestId])

  const handleJoin = useCallback(async (data) => {
    try {
      await joinContest(contestId, data)
      await loadContest()
    } catch (err) {
      throw err
    }
  }, [contestId, loadContest])

  return { contest, leaderboard, loading, loadContest, joinContest: handleJoin }
}
