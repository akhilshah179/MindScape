import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, Download, RotateCcw, XCircle } from 'lucide-react'
import { Button, cx, useToast } from '../ui'
import { saveFileQuizScore } from '../../services/fileApi'

/** Runs a quiz one question at a time; the final score is graded and stored by the server. */
export default function QuizRunner({ quiz, fileId, fileName, onDone }) {
  const { toast } = useToast()
  const qs = quiz.questions
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const q = qs[i]

  const confirm = () => { if (picked !== null) setRevealed(true) }
  const next = async () => {
    const all = [...answers, picked]
    setAnswers(all)
    if (i + 1 < qs.length) { setI(i + 1); setPicked(null); setRevealed(false); return }
    setSaving(true)
    try {
      const { score } = await saveFileQuizScore(fileId, { answers: all })
      setResult(score)
      onDone?.(score)
    } catch (err) {
      toast(`Your result couldn't be saved: ${err.message}`, 'error')
      setResult({ score: all.filter((a, k) => a === qs[k].answer).length, total: qs.length, pct: Math.round(all.filter((a, k) => a === qs[k].answer).length / qs.length * 100), unsaved: true })
    } finally { setSaving(false) }
  }
  const restart = () => { setI(0); setPicked(null); setRevealed(false); setAnswers([]); setResult(null) }

  const exportCsv = () => {
    const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
    const rows = [['#', 'Question', 'Your answer', 'Correct answer', 'Result'],
      ...qs.map((x, k) => [k + 1, esc(x.question), esc(x.options[answers[k]]), esc(x.options[x.answer]), answers[k] === x.answer ? 'Correct' : 'Wrong'])]
    const url = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `${(fileName || 'quiz').replace(/\.pdf$/i, '')}-quiz.csv` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (result) {
    const tone = result.pct >= 80 ? 'text-ok' : result.pct >= 50 ? 'text-warn' : 'text-bad'
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <p className={cx('font-display text-5xl font-semibold', tone)}>{result.pct}%</p>
          <p className="text-ink-2 text-sm mt-1">{result.score} of {result.total} correct{result.unsaved ? ' · not saved' : ''}</p>
        </div>
        <div className="space-y-2">
          {qs.map((x, k) => (
            <div key={k} className="p-3 rounded-xl border text-sm">
              <div className="flex gap-2">
                {answers[k] === x.answer ? <CheckCircle2 className="w-4 h-4 text-ok shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-bad shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-ink">{x.question}</p>
                  {answers[k] !== x.answer && <p className="text-xs text-ink-3 mt-1">Correct: <span className="text-ink-2">{x.options[x.answer]}</span></p>}
                  <p className="text-xs text-ink-3 mt-1">{x.explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={RotateCcw} onClick={restart} className="flex-1">Retake</Button>
          <Button variant="secondary" icon={Download} onClick={exportCsv} className="flex-1">Export CSV</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-ink-3 mb-2">
        <span>Question {i + 1} of {qs.length}</span>
        <span>{answers.filter((a, k) => a === qs[k].answer).length} correct so far</span>
      </div>
      <div className="h-1 rounded-full bg-surface-3 mb-5 overflow-hidden"><motion.div className="h-full bg-accent-gradient" animate={{ width: `${((i + (revealed ? 1 : 0)) / qs.length) * 100}%` }} /></div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
          <p className="text-ink font-medium leading-relaxed">{q.question}</p>
          <div className="mt-4 space-y-2" role="radiogroup">
            {q.options.map((opt, k) => {
              const correct = revealed && k === q.answer
              const wrong = revealed && k === picked && k !== q.answer
              return (
                <button key={k} role="radio" aria-checked={picked === k} disabled={revealed} onClick={() => setPicked(k)}
                  className={cx('w-full flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-colors',
                    correct ? 'border-ok/50 bg-ok/10' : wrong ? 'border-bad/50 bg-bad/10' : picked === k ? 'border-accent/60 bg-accent/10' : 'hover:bg-surface-2')}>
                  <span className={cx('w-6 h-6 rounded-md text-xs font-semibold flex items-center justify-center shrink-0', picked === k || correct ? 'bg-accent text-white' : 'bg-surface-3 text-ink-2', correct && 'bg-ok', wrong && 'bg-bad')}>{String.fromCharCode(65 + k)}</span>
                  <span className="text-ink">{opt}</span>
                </button>
              )
            })}
          </div>
          {revealed && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm text-ink-2 p-3 rounded-xl bg-surface-2">{q.explanation}</motion.p>}
        </motion.div>
      </AnimatePresence>
      <div className="mt-5 flex justify-end">
        {revealed
          ? <Button iconRight={ChevronRight} loading={saving} onClick={next}>{i + 1 < qs.length ? 'Next question' : 'See results'}</Button>
          : <Button onClick={confirm} disabled={picked === null}>Check answer</Button>}
      </div>
    </div>
  )
}
