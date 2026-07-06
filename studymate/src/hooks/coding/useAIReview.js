import { useState, useCallback } from 'react'
import { aiReviewCode, aiGetHint, aiDebugCode } from '../../services/coding/codingApi'

export function useAIReview() {
  const [reviewResult, setReviewResult] = useState(null)
  const [hints, setHints] = useState([null, null, null])
  const [debugResult, setDebugResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState(null)

  const reviewCode = useCallback(async ({ code, language, problemTitle }) => {
    setLoading(true)
    setActiveAction('review')
    try {
      const data = await aiReviewCode({ code, language, problemTitle })
      setReviewResult(data)
      return data
    } catch (err) {
      console.error('AI Review Error:', err)
      return null
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }, [])

  const getHint = useCallback(async ({ problemId, hintLevel }) => {
    setLoading(true)
    setActiveAction('hint')
    try {
      const data = await aiGetHint({ problemId, hintLevel })
      setHints(prev => {
        const next = [...prev]
        next[hintLevel - 1] = data
        return next
      })
      return data
    } catch (err) {
      console.error('AI Hint Error:', err)
      return null
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }, [])

  const debugCode = useCallback(async ({ code, language, error, userId }) => {
    setLoading(true)
    setActiveAction('debug')
    try {
      const data = await aiDebugCode({ code, language, error, userId })
      setDebugResult(data)
      return data
    } catch (err) {
      console.error('AI Debug Error:', err)
      return null
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }, [])

  const clearAll = useCallback(() => {
    setReviewResult(null)
    setHints([null, null, null])
    setDebugResult(null)
  }, [])

  return {
    reviewResult,
    hints,
    debugResult,
    loading,
    activeAction,
    reviewCode,
    getHint,
    debugCode,
    clearAll
  }
}
