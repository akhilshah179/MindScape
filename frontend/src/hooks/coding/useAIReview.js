import { useState, useCallback } from 'react'
import { aiReviewCode, aiGetHint, aiDebugCode } from '../../services/coding/codingApi'

/** AI review / hints / debugging. Errors are surfaced via `error` (shown in the panels). */
export function useAIReview() {
  const [reviewResult, setReviewResult] = useState(null)
  const [hints, setHints] = useState([null, null, null])
  const [debugResult, setDebugResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState(null)
  const [error, setError] = useState(null)

  const run = useCallback(async (action, fn) => {
    setLoading(true)
    setActiveAction(action)
    setError(null)
    try {
      return await fn()
    } catch (err) {
      setError({ action, message: err.message })
      return null
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }, [])

  const reviewCode = useCallback((args) => run('review', async () => {
    const data = await aiReviewCode(args)
    setReviewResult(data)
    return data
  }), [run])

  const getHint = useCallback(({ problemId, hintLevel }) => run('hint', async () => {
    const data = await aiGetHint({ problemId, hintLevel })
    setHints(prev => { const next = [...prev]; next[hintLevel - 1] = data; return next })
    return data
  }), [run])

  const debugCode = useCallback((args) => run('debug', async () => {
    const data = await aiDebugCode(args)
    setDebugResult(data)
    return data
  }), [run])

  const clearAll = useCallback(() => { setReviewResult(null); setHints([null, null, null]); setDebugResult(null); setError(null) }, [])

  return { reviewResult, hints, debugResult, loading, activeAction, error, reviewCode, getHint, debugCode, clearAll }
}
