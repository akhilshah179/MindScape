import { motion } from 'framer-motion'
import { AlertTriangle, Award, CheckCircle2, Clock, Cpu, EyeOff, Loader2, Play, Trophy, XCircle, Zap } from 'lucide-react'
import { cx } from '../ui'

const VERDICT_TONE = {
  Accepted: 'text-ok', 'Wrong Answer': 'text-bad', 'Time Limit Exceeded': 'text-warn',
  'Runtime Error': 'text-orange-400', 'Compilation Error': 'text-bad', 'Internal Error': 'text-warn'
}
const Pre = ({ label, children, tone }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-ink-3 mb-1">{label}</p>
    <pre className={cx('text-xs font-mono rounded-lg px-3 py-2 bg-canvas border overflow-x-auto whitespace-pre-wrap break-words max-h-48', tone || 'text-ink-2')}>{children}</pre>
  </div>
)

function TestRow({ tc }) {
  if (tc.hidden) {
    return (
      <div className={cx('flex items-center gap-2 px-3 h-9 rounded-lg border text-xs', tc.passed ? 'border-ok/20' : 'border-bad/25')}>
        {tc.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-ok" /> : <XCircle className="w-3.5 h-3.5 text-bad" />}
        <span className="text-ink-2">Test {tc.testCase}</span>
        <span className="inline-flex items-center gap-1 text-ink-3"><EyeOff className="w-3 h-3" />hidden</span>
        <span className={cx('ml-auto', VERDICT_TONE[tc.verdict])}>{tc.verdict}</span>
        {tc.time && <span className="text-ink-3 tabular-nums">{tc.time}s</span>}
      </div>
    )
  }
  return (
    <details className={cx('group rounded-lg border overflow-hidden', tc.passed ? 'border-ok/20' : 'border-bad/25')} open={!tc.passed}>
      <summary className="flex items-center gap-2 px-3 h-9 cursor-pointer text-xs list-none">
        {tc.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-ok" /> : <XCircle className="w-3.5 h-3.5 text-bad" />}
        <span className="text-ink-2">Test {tc.testCase}</span>
        <span className={cx('ml-auto', VERDICT_TONE[tc.verdict])}>{tc.verdict}</span>
        {tc.time && <span className="text-ink-3 tabular-nums">{tc.time}s</span>}
        {tc.memory && <span className="text-ink-3 tabular-nums">{Math.round(tc.memory / 1024 * 10) / 10}MB</span>}
      </summary>
      <div className="px-3 pb-3 grid gap-2">
        <Pre label="Input">{tc.input}</Pre>
        <div className="grid sm:grid-cols-2 gap-2">
          <Pre label="Expected">{tc.expectedOutput}</Pre>
          <Pre label="Your output" tone={tc.passed ? 'text-ok' : 'text-bad'}>{tc.actualOutput ?? '(no output)'}</Pre>
        </div>
        {(tc.compile_output || tc.stderr) && <Pre label="Error" tone="text-bad">{tc.compile_output || tc.stderr}</Pre>}
      </div>
    </details>
  )
}

export default function OutputPanel({ runResults, submitResults, error, isRunning, isSubmitting }) {
  const res = submitResults || runResults
  if (isRunning || isSubmitting) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-ink-3 text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        {isSubmitting ? 'Judging against all test cases…' : 'Running sample tests…'}
      </div>
    )
  }
  if (error) {
    return (
      <div className="h-full overflow-auto thin-scroll p-4">
        <div className="flex items-center gap-2 text-bad text-sm font-medium mb-2"><AlertTriangle className="w-4 h-4" />Couldn't run your code</div>
        <p className="text-sm text-ink-2">{error}</p>
      </div>
    )
  }
  if (!res) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-ink-3 text-sm">
        <Play className="w-5 h-5" />Run to test against the samples, submit to be judged.
        <span className="text-xs">Ctrl+Enter run · Ctrl+Shift+Enter submit</span>
      </div>
    )
  }

  // Custom-input run
  if (res.mode === 'custom') {
    return (
      <div className="h-full overflow-auto thin-scroll p-4 space-y-3">
        <p className={cx('text-sm font-semibold', VERDICT_TONE[res.verdict] || 'text-ink')}>{res.verdict === 'Accepted' ? 'Finished' : res.verdict}{res.time ? <span className="text-ink-3 font-normal ml-2 text-xs">{res.time}s</span> : null}</p>
        {res.stdout != null && <Pre label="Output" tone="text-ink">{res.stdout || '(empty)'}</Pre>}
        {(res.compile_output || res.stderr) && <Pre label="Error" tone="text-bad">{res.compile_output || res.stderr}</Pre>}
      </div>
    )
  }

  const verdict = res.verdict || (res.allPassed ? 'Accepted' : 'Wrong Answer')
  const accepted = verdict === 'Accepted'
  const g = res.gamification
  const isSubmit = Boolean(submitResults)
  return (
    <div className="h-full overflow-auto thin-scroll">
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b">
        <span className={cx('text-base font-semibold', VERDICT_TONE[verdict] || 'text-ink')}>{isSubmit ? verdict : accepted ? 'Sample tests passed' : verdict}</span>
        <span className="text-xs text-ink-3">{res.passedTests}/{res.totalTests} tests passed</span>
        {res.runtime != null && <span className="text-xs text-ink-3 inline-flex items-center gap-1"><Clock className="w-3 h-3" />{res.runtime}s</span>}
        {res.memory != null && <span className="text-xs text-ink-3 inline-flex items-center gap-1"><Cpu className="w-3 h-3" />{(res.memory / 1024).toFixed(1)} MB</span>}
      </div>
      {isSubmit && accepted && g && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-3 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
          {g.xpAwarded > 0 ? <span className="inline-flex items-center gap-1.5 text-accent-ink font-medium"><Zap className="w-4 h-4" />+{g.xpAwarded} XP</span>
            : <span className="text-ink-2">Already solved — no extra XP</span>}
          {g.leveledUp && <span className="text-ink font-medium">Level up! You're now level {g.level}</span>}
          {g.newBadges?.map(b => <span key={b.id} className="inline-flex items-center gap-1 text-warn"><Award className="w-4 h-4" />{b.icon} {b.name}</span>)}
        </motion.div>
      )}
      {isSubmit && res.contest && (
        <div className={cx('mx-4 mt-3 rounded-xl border px-4 py-2.5 text-sm flex items-center gap-2', res.contest.scored ? 'border-warn/30 bg-warn/10 text-ink' : 'text-ink-3')}>
          <Trophy className="w-4 h-4 text-warn" />
          {res.contest.scored ? <>Contest score {res.contest.score} · rank #{res.contest.rank}</> : <>Not scored: {res.contest.reason}</>}
        </div>
      )}
      <div className="p-4 space-y-2">{(res.results || []).map(tc => <TestRow key={tc.testCase} tc={tc} />)}</div>
    </div>
  )
}
