import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bug, FileCode2, History, Lightbulb, Loader2, Play, RotateCcw, Send, Sparkles, TerminalSquare, Trophy } from 'lucide-react'
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
import { Button, EmptyState, Segmented, Spinner, cx } from '../../components/ui'

const LEFT_TABS = [
  { id: 'description', label: 'Problem', icon: FileCode2 },
  { id: 'submissions', label: 'Submissions', icon: History },
  { id: 'review', label: 'AI review', icon: Sparkles },
  { id: 'hints', label: 'Hints', icon: Lightbulb },
  { id: 'debug', label: 'Debug', icon: Bug },
]
// Drafts survive refresh; cleared on sign-out with other per-user cache.
const draftKey = (id, lang) => `mindscape_cache_draft_${id}_${lang}`
const loadDraft = (id, lang) => { try { return localStorage.getItem(draftKey(id, lang)) } catch { return null } }

export default function ProblemDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const contestId = params.get('contest')
  const navigate = useNavigate()
  const { refreshProfile } = useOutletContext() || {}
  const { problem, loading } = useProblem(id)
  const exec = useCodeExecution()
  const ai = useAIReview()
  const subs = useSubmissions()

  const [language, setLanguage] = useState(() => { try { return localStorage.getItem('mindscape_cache_lang') || 'python' } catch { return 'python' } })
  const [code, setCode] = useState('')
  const [leftTab, setLeftTab] = useState('description')
  const [bottomTab, setBottomTab] = useState('result')
  const [stdin, setStdin] = useState('')
  const [split, setSplit] = useState(44)
  const [mobilePane, setMobilePane] = useState('problem')
  const saveTimer = useRef(0)

  // Load draft or starter code when problem/language changes (never discard typed code)
  useEffect(() => {
    if (!problem) return
    setCode(loadDraft(problem.id, language) ?? problem.starterCode?.[language] ?? '')
    if (!stdin && problem.sampleTests?.[0]) setStdin(problem.sampleTests[0].input)
  }, [problem, language]) // eslint-disable-line react-hooks/exhaustive-deps

  const onCodeChange = (v) => {
    setCode(v)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { try { localStorage.setItem(draftKey(id, language), v) } catch { /* quota */ } }, 400)
  }
  const changeLanguage = (l) => { setLanguage(l); try { localStorage.setItem('mindscape_cache_lang', l) } catch { /* ignore */ } }
  const resetCode = () => { if (!problem) return; setCode(problem.starterCode[language]); try { localStorage.removeItem(draftKey(id, language)) } catch { /* ignore */ } }

  useEffect(() => { if (leftTab === 'submissions') subs.loadSubmissions(id) }, [leftTab, id]) // eslint-disable-line react-hooks/exhaustive-deps

  const onRun = useCallback(() => {
    setBottomTab('result'); setMobilePane('code')
    exec.handleRun({ code, language, problemId: id, stdin: bottomTab === 'input' ? stdin : undefined })
  }, [code, language, id, stdin, bottomTab, exec])

  const onSubmit = useCallback(async () => {
    setBottomTab('result'); setMobilePane('code')
    const result = await exec.handleSubmit({ problemId: id, language, code, contestId })
    if (result) {
      refreshProfile?.()
      if (leftTab === 'submissions') subs.loadSubmissions(id)
      if (result.verdict === 'Accepted') ai.reviewCode({ code, language, problemTitle: problem.title })
    }
  }, [code, language, id, contestId, exec, refreshProfile, ai, problem, leftTab, subs])

  const onDebug = useCallback(() => {
    const failing = exec.submitResults?.results?.find(r => !r.passed) || exec.runResults?.results?.find(r => !r.passed)
    const lastError = exec.runResults?.stderr || exec.runResults?.compile_output || failing?.compile_output || failing?.stderr
      || (failing ? `Wrong answer. Input: ${failing.input ?? '(hidden)'} Expected: ${failing.expectedOutput ?? '(hidden)'} Got: ${failing.actualOutput ?? '(hidden)'}` : exec.error || '')
    ai.debugCode({ code, language, error: lastError })
  }, [code, language, exec, ai])

  if (loading) return <div className="h-full flex items-center justify-center"><Spinner /></div>
  if (!problem) return <EmptyState title="Problem not found" description="It may have been removed." action={<Button onClick={() => navigate('/coding/problems')}>All problems</Button>} className="h-full" />

  const busy = exec.isRunning || exec.isSubmitting
  const left = (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-0.5 px-2 h-11 border-b overflow-x-auto thin-scroll shrink-0">
        {LEFT_TABS.map(t => (
          <button key={t.id} onClick={() => setLeftTab(t.id)} className={cx('inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap', leftTab === t.id ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink')}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto thin-scroll p-4 sm:p-5">
        {leftTab === 'description' && <ProblemDescription problem={problem} />}
        {leftTab === 'submissions' && <SubmissionHistory submissions={subs.submissions} loading={subs.loading} onLoad={(s) => { setLanguage(s.language); setCode(s.code) }} />}
        {leftTab === 'review' && <AIReviewPanel reviewResult={ai.reviewResult} loading={ai.loading && ai.activeAction === 'review'} onReview={() => ai.reviewCode({ code, language, problemTitle: problem.title })} error={ai.error} />}
        {leftTab === 'hints' && <AIHintPanel hints={ai.hints} onGetHint={(level) => ai.getHint({ problemId: id, hintLevel: level })} loading={ai.loading && ai.activeAction === 'hint'} />}
        {leftTab === 'debug' && <AIDebugPanel debugResult={ai.debugResult} loading={ai.loading && ai.activeAction === 'debug'} onDebug={onDebug} />}
      </div>
    </div>
  )

  const right = (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-2 h-11 border-b shrink-0">
        <select value={language} onChange={e => changeLanguage(e.target.value)} aria-label="Language" className="h-8 rounded-lg bg-surface-2 border px-2 text-xs text-ink">
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button onClick={resetCode} className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-xs text-ink-3 hover:text-ink hover:bg-surface-2" title="Reset to starter code"><RotateCcw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Reset</span></button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" icon={exec.isRunning ? Loader2 : Play} disabled={busy} onClick={onRun} className={exec.isRunning ? '[&>svg]:animate-spin' : ''}>Run</Button>
          <Button size="sm" icon={Send} loading={exec.isSubmitting} disabled={busy} onClick={onSubmit}>Submit</Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-[#0d0d14]"><CodeEditor language={language} value={code} onChange={onCodeChange} onRun={onRun} onSubmit={onSubmit} /></div>
      <div className="h-[38%] min-h-[160px] border-t flex flex-col shrink-0">
        <div className="flex items-center gap-1 px-2 h-10 border-b shrink-0">
          {[['result', 'Result', TerminalSquare], ['input', 'Custom input', FileCode2]].map(([k, l, I]) => (
            <button key={k} onClick={() => setBottomTab(k)} className={cx('inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs', bottomTab === k ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink')}><I className="w-3.5 h-3.5" />{l}</button>
          ))}
          {bottomTab === 'input' && <span className="ml-auto text-[11px] text-ink-3 pr-2">Run uses this input (same format as tests)</span>}
        </div>
        <div className="flex-1 min-h-0">
          {bottomTab === 'input'
            ? <textarea value={stdin} onChange={e => setStdin(e.target.value)} spellCheck={false} aria-label="Custom input" className="w-full h-full resize-none bg-canvas p-3 font-mono text-xs text-ink focus:outline-none" />
            : <OutputPanel runResults={exec.runResults} submitResults={exec.submitResults} error={exec.error} isRunning={exec.isRunning} isSubmitting={exec.isSubmitting} />}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 shrink-0 flex items-center gap-3 px-3 border-b bg-surface/60">
        <Link to={contestId ? `/coding/contest/${contestId}` : '/coding/problems'} className="inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink"><ArrowLeft className="w-4 h-4" />{contestId ? 'Contest' : 'Problems'}</Link>
        <span className="w-px h-4 bg-[rgb(var(--line)/0.12)]" />
        <h1 className="text-sm font-medium text-ink truncate">{problem.title}</h1>
        {contestId && <span className="inline-flex items-center gap-1 text-[11px] text-warn bg-warn/10 border border-warn/20 rounded-md px-2 h-6"><Trophy className="w-3 h-3" />Contest mode</span>}
        <div className="ml-auto lg:hidden"><Segmented layoutId="pd-mobile" value={mobilePane} onChange={setMobilePane} options={[{ value: 'problem', label: 'Problem' }, { value: 'code', label: 'Code' }]} /></div>
      </div>
      {/* desktop: resizable split */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <div style={{ width: `${split}%` }} className="min-w-0 border-r">{left}</div>
        <div role="separator" aria-orientation="vertical" tabIndex={0} aria-label="Resize panels"
          onKeyDown={e => { if (e.key === 'ArrowLeft') setSplit(s => Math.max(25, s - 2)); if (e.key === 'ArrowRight') setSplit(s => Math.min(70, s + 2)) }}
          onPointerDown={e => {
            const parent = e.currentTarget.parentElement
            const move = (ev) => { const r = parent.getBoundingClientRect(); setSplit(Math.min(70, Math.max(25, ((ev.clientX - r.left) / r.width) * 100))) }
            const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
            window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
          }}
          className="w-1.5 -mx-[3px] z-10 cursor-col-resize hover:bg-accent/40 focus:bg-accent/40 transition-colors" />
        <div className="flex-1 min-w-0">{right}</div>
      </div>
      {/* mobile: one pane at a time */}
      <div className="lg:hidden flex-1 min-h-0">{mobilePane === 'problem' ? left : right}</div>
    </div>
  )
}
