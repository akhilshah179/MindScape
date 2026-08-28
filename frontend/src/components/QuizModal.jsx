import { useState } from 'react'
import { saveQuizScore } from '../hooks/useStudyTracker'

export default function QuizModal({ questions, fileName, subjectName, onClose }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [saved, setSaved] = useState(false)

  const question = questions[current]
  const totalQuestions = questions.length
  const score = answers.filter(a => a.correct).length

  const handleSelect = (i) => { if (!confirmed) setSelected(i) }

  const handleConfirm = () => {
    if (selected === null) return
    const isCorrect = selected === question.answer
    setAnswers(prev => [...prev, { selected, correct: isCorrect }])
    setConfirmed(true)
  }

  const handleNext = () => {
    if (current + 1 >= totalQuestions) {
      setShowResult(true)
      // FIX: build finalAnswers synchronously — React state (answers) hasn't
      // flushed the last answer yet when this runs, so score was always off-by-one
      if (!saved) {
        const lastAnswer = { selected, correct: selected === question.answer }
        const finalAnswers = [...answers, lastAnswer]
        const finalScore = finalAnswers.filter(a => a.correct).length
        saveQuizScore({
          subjectName,
          fileName,
          score: finalScore,
          total: totalQuestions,
          questions,
          answers: finalAnswers,
        })
        setSaved(true)
      }
    } else {
      setCurrent(p => p + 1)
      setSelected(null)
      setConfirmed(false)
    }
  }

  const handleRestart = () => {
    setCurrent(0); setSelected(null); setAnswers([])
    setShowResult(false); setConfirmed(false); setSaved(false)
  }

  const pct = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0
  const scoreColor = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'
  const scoreMsg = pct === 100 ? '🏆 Perfect Score! Outstanding!'
    : pct >= 80 ? '🎉 Excellent! Keep it up!'
      : pct >= 60 ? '👍 Good job! Review the missed ones.'
        : pct >= 40 ? '📚 Keep studying, you will get there!'
          : "💪 Don't give up! Try again."
  const quizTitle = subjectName ? `${subjectName} Quiz` : 'Quiz'

  // ── Export quiz results as CSV ──────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['#', 'Question', 'Your Answer', 'Correct Answer', 'Result'],
      ...questions.map((q, i) => [
        i + 1,
        `"${q.question.replace(/"/g, '""')}"`,
        `"${q.options[answers[i]?.selected] || ''}"`,
        `"${q.options[q.answer]}"`,
        answers[i]?.correct ? 'Correct' : 'Wrong',
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url, download: `${subjectName}_quiz_results.csv`
    })
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-900 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-white font-bold text-lg">🧠 {quizTitle}</h2>
            <p className="text-purple-200 text-xs truncate">{fileName}</p>
          </div>
          <button onClick={onClose}
            className="text-white/60 hover:text-white text-2xl leading-none transition-colors shrink-0">×</button>
        </div>

        {/* ── Result Screen ── */}
        {showResult ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">
              {score === totalQuestions ? '🏆' : score >= totalQuestions / 2 ? '🎉' : '📚'}
            </div>
            <h3 className="text-white text-2xl font-bold mb-2">Quiz Complete!</h3>
            <p className="text-gray-400 mb-6">{scoreMsg}</p>

            <div className={`text-6xl font-bold mb-2 ${scoreColor}`}>{score}/{totalQuestions}</div>
            <p className="text-gray-400 text-sm mb-2">{pct}% correct</p>
            <p className="text-purple-400 text-xs mb-8">✅ Score saved to your analytics</p>

            {/* Answer review */}
            <div className="text-left space-y-3 mb-8 max-h-56 overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <div key={i} className={`rounded-xl p-3 border ${answers[i]?.correct ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                  <p className="text-white text-sm font-medium mb-1">
                    {answers[i]?.correct ? '✅' : '❌'} Q{i + 1}: {q.question}
                  </p>
                  {!answers[i]?.correct && (
                    <p className="text-green-400 text-xs">Correct: {q.options[q.answer]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={handleRestart}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
                🔄 Try Again
              </button>
              <button onClick={exportCSV}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
                ⬇️ Export CSV
              </button>
              <button onClick={onClose}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
                Close
              </button>
            </div>
          </div>

        ) : (
          /* ── Question Screen ── */
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs">Question {current + 1} of {totalQuestions}</span>
              <span className="text-purple-400 text-xs font-medium">
                Score: {answers.filter(a => a.correct).length}/{answers.length}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mb-6">
              <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${((current + (confirmed ? 1 : 0)) / totalQuestions) * 100}%` }} />
            </div>

            <h3 className="text-white font-semibold text-lg mb-6 leading-relaxed">{question.question}</h3>

            <div className="space-y-3 mb-6">
              {question.options.map((option, index) => {
                let style = 'bg-white/5 border-white/10 text-white hover:bg-white/10 cursor-pointer'
                if (confirmed) {
                  if (index === question.answer)
                    style = 'bg-green-900/40 border-green-500 text-green-300 cursor-default'
                  else if (index === selected && selected !== question.answer)
                    style = 'bg-red-900/40 border-red-500 text-red-300 cursor-default'
                  else
                    style = 'bg-white/5 border-white/5 text-white/40 cursor-default'
                } else if (selected === index)
                  style = 'bg-purple-600/40 border-purple-500 text-white cursor-pointer'

                return (
                  <button key={index} onClick={() => handleSelect(index)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 text-sm ${style}`}>
                    <span className="font-bold mr-2 text-white/50">{['A', 'B', 'C', 'D'][index]}.</span>
                    {option}
                  </button>
                )
              })}
            </div>

            {!confirmed ? (
              <button onClick={handleConfirm} disabled={selected === null}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40
                  disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors">
                Confirm Answer
              </button>
            ) : (
              <button onClick={handleNext}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-colors">
                {current + 1 >= totalQuestions ? 'See Results 🎯' : 'Next Question →'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
