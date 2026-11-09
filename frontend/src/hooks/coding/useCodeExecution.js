import { useState, useCallback } from 'react'
import { runCode, submitCode } from '../../services/coding/codingApi'

export function useCodeExecution() {
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runResults, setRunResults] = useState(null)
  const [submitResults, setSubmitResults] = useState(null)
  const [error, setError] = useState(null)

  const handleRun = useCallback(async ({ code, language, problemId, stdin }) => {
    setIsRunning(true)
    setError(null)
    setRunResults(null)
    try {
      const data = await runCode({ code, language, problemId, stdin })
      setRunResults(data)
      return data
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Execution failed'
      setError(msg)
      return null
    } finally {
      setIsRunning(false)
    }
  }, [])

  const handleSubmit = useCallback(async ({ userId, problemId, language, code }) => {
    setIsSubmitting(true)
    setError(null)
    setSubmitResults(null)
    try {
      const data = await submitCode({ userId, problemId, language, code })
      setSubmitResults(data)
      return data
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Submission failed'
      setError(msg)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setRunResults(null)
    setSubmitResults(null)
    setError(null)
  }, [])

  return {
    isRunning,
    isSubmitting,
    runResults,
    submitResults,
    error,
    handleRun,
    handleSubmit,
    clearResults
  }
}
