import { useState, useCallback, useEffect } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { useProblem } from '../../hooks/coding/useProblems'
import { useCodeExecution } from '../../hooks/coding/useCodeExecution'
import { useAIReview } from '../../hooks/coding/useAIReview'
import { useSubmissions } from '../../hooks/coding/useSubmissions'
import CodeEditor from '../../components/coding/CodeEditor'
import OutputPanel from '../../components/coding/OutputPanel'
import ProblemDescription from '../../components/coding/ProblemDescription'
import AIReviewPanel from '../../components/coding/AIReviewPanel'
import AIHintPanel from '../../components/coding/AIHintPanel'
import AIDebugPanel from '../../components/coding/AIDebugPanel'
import SubmissionHistory from '../../components/coding/SubmissionHistory'
import { LANGUAGES } from '../../services/coding/problems'

export default function ProblemDetail() {
  const { id } = useParams()
  const { user } = useOutletContext() || {}
  const { problem, loading: problemLoading } = useProblem(id)
  const { isRunning, isSubmitting, runResults, submitResults, error, handleRun, handleSubmit, clearResults } = useCodeExecution()
  const { reviewResult, hints, debugResult, loading: aiLoading, activeAction, reviewCode, getHint, debugCode } = useAIReview()
  const { submissions, loading: subLoading, loadSubmissions } = useSubmissions(user?.userId)

  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState('')
  const [leftTab, setLeftTab] = useState('description')
  const [splitRatio, setSplitRatio] = useState(45) // left panel percentage

  // Set starter code when problem loads or language changes
  useEffect(() => {
    if (problem?.starterCode?.[language]) {
      setCode(problem.starterCode[language])
    }
  }, [problem, language])

  // Load submissions when tab changes
  useEffect(() => {
    if (leftTab === 'submissions' && user?.userId) {
      loadSubmissions(id)
    }
  }, [leftTab, id, user?.userId])

  const onRun = useCallback(() => {
    handleRun({ code, language, problemId: id })
  }, [code, language, id, handleRun])

  const onSubmit = useCallback(async () => {
    if (!user?.userId) return
    const result = await handleSubmit({ userId: user.userId, problemId: id, language, code })
    // Auto-trigger AI review on submission
    if (result && problem) {
      reviewCode({ code, language, problemTitle: problem.title })
    }
  }, [code, language, id, user, handleSubmit, reviewCode, problem])

  const onGetHint = useCallback((level) => {
    getHint({ problemId: id, hintLevel: level })
  }, [id, getHint])

  const onDebug = useCallback(() => {
    const lastError = runResults?.stderr || submitResults?.results?.find(r => !r.passed)?.stderr || error || ''
    debugCode({ code, language, error: lastError, userId: user?.userId })
  }, [code, language, runResults, submitResults, error, user, debugCode])

  if (problemLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="h-screen flex items-center justify-center text-white/30">
        <div className="text-center">
          <span className="text-3xl block mb-3">🚫</span>
          <p className="text-sm">Problem not found</p>
        </div>
      </div>
    )
  }

  const leftTabs = [
    { id: 'description', label: 'Description', icon: '📋' },
    { id: 'submissions', label: 'Submissions', icon: '📝' },
    { id: 'review', label: 'AI Review', icon: '🤖' },
    { id: 'hints', label: 'Hints', icon: '💡' },
    { id: 'debug', label: 'Debug', icon: '🐛' },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#08080d] border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => history.back()} className="text-white/30 hover:text-white/60 text-xs transition-colors">← Back</button>
          <div className="w-px h-4 bg-white/[0.08]" />
          <h2 className="text-sm font-semibold text-white/80 truncate max-w-[300px]">{problem.title}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.06]">
            {LANGUAGES.map(l => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all
                  ${language === l.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/30 hover:text-white/50'}`}
              >
                {l.icon} {l.name}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={onRun}
            disabled={isRunning}
            className="px-4 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-white/70 rounded-lg text-xs font-medium border border-white/[0.06] transition-all disabled:opacity-40"
          >
            {isRunning ? '⟳' : '▶'} Run
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !user}
            className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-500/20 transition-all disabled:opacity-40"
          >
            {isSubmitting ? '⟳' : '↑'} Submit
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div style={{ width: `${splitRatio}%` }} className="flex flex-col border-r border-white/[0.06] overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 bg-[#08080d] border-b border-white/[0.06] overflow-x-auto shrink-0">
            {leftTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setLeftTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap
                  ${leftTab === tab.id ? 'bg-white/[0.06] text-white/80' : 'text-white/25 hover:text-white/50'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-4">
            {leftTab === 'description' && <ProblemDescription problem={problem} />}
            {leftTab === 'submissions' && <SubmissionHistory submissions={submissions} loading={subLoading} />}
            {leftTab === 'review' && <AIReviewPanel reviewResult={reviewResult} loading={aiLoading && activeAction === 'review'} />}
            {leftTab === 'hints' && <AIHintPanel hints={hints} onGetHint={onGetHint} loading={aiLoading && activeAction === 'hint'} />}
            {leftTab === 'debug' && <AIDebugPanel debugResult={debugResult} loading={aiLoading && activeAction === 'debug'} onDebug={onDebug} />}
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="w-1 bg-white/[0.03] hover:bg-indigo-500/30 cursor-col-resize transition-colors shrink-0"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startRatio = splitRatio
            const onMove = (ev) => {
              const delta = ev.clientX - startX
              const parentWidth = e.target.parentElement.offsetWidth
              const newRatio = startRatio + (delta / parentWidth) * 100
              setSplitRatio(Math.min(70, Math.max(25, newRatio)))
            }
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
        />

        {/* Right panel */}
        <div style={{ width: `${100 - splitRatio}%` }} className="flex flex-col overflow-hidden">
          {/* Code editor */}
          <div className="flex-1 min-h-0">
            <CodeEditor
              language={language}
              value={code}
              onChange={setCode}
              onRun={onRun}
              onSubmit={onSubmit}
            />
          </div>

          {/* Output panel */}
          <div className="h-[35%] min-h-[120px] border-t border-white/[0.06] overflow-hidden">
            <OutputPanel
              runResults={runResults}
              submitResults={submitResults}
              error={error}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
