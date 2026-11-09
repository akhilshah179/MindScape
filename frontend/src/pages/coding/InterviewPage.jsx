import { useState, useCallback } from 'react'
import { aiInterviewQuestions, aiMockInterview } from '../../services/coding/codingApi'

const TOPICS = [
  { id: 'dsa', name: 'Data Structures & Algorithms', icon: '🧮', desc: 'Arrays, Trees, Graphs, DP', color: 'emerald' },
  { id: 'oop', name: 'Object Oriented Programming', icon: '🏗️', desc: 'Classes, Inheritance, Polymorphism', color: 'blue' },
  { id: 'dbms', name: 'Database Management', icon: '🗄️', desc: 'SQL, Normalization, Indexing', color: 'violet' },
  { id: 'os', name: 'Operating Systems', icon: '⚙️', desc: 'Processes, Memory, Scheduling', color: 'amber' },
  { id: 'cn', name: 'Computer Networks', icon: '🌐', desc: 'TCP/IP, HTTP, DNS, OSI Model', color: 'cyan' },
  { id: 'hr', name: 'HR Questions', icon: '💼', desc: 'Behavioral, Situational, Culture', color: 'rose' },
]

export default function InterviewPage() {
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loadingQ, setLoadingQ] = useState(false)
  const [expandedQ, setExpandedQ] = useState(null)

  // Mock Interview state
  const [mockMode, setMockMode] = useState(false)
  const [mockMessages, setMockMessages] = useState([])
  const [mockInput, setMockInput] = useState('')
  const [mockLoading, setMockLoading] = useState(false)

  const generateQuestions = useCallback(async (topic) => {
    setSelectedTopic(topic)
    setLoadingQ(true)
    setQuestions([])
    try {
      const data = await aiInterviewQuestions({ topic: topic.name, count: 8 })
      setQuestions(data.questions || [])
    } catch (err) {
      console.error('Error generating questions:', err)
    } finally {
      setLoadingQ(false)
    }
  }, [])

  const startMock = (topic) => {
    setSelectedTopic(topic)
    setMockMode(true)
    setMockMessages([{
      role: 'assistant',
      content: `Hello! I'll be your interviewer today for ${topic.name}. Let's begin.\n\nTell me about yourself and your experience with ${topic.name}.`
    }])
  }

  const sendMockMessage = async () => {
    if (!mockInput.trim() || mockLoading) return
    const userMsg = { role: 'user', content: mockInput }
    const newMsgs = [...mockMessages, userMsg]
    setMockMessages(newMsgs)
    setMockInput('')
    setMockLoading(true)

    try {
      const data = await aiMockInterview({ topic: selectedTopic.name, messages: newMsgs })
      setMockMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.response || data.content || 'Could you elaborate on that?' }])
    } catch (err) {
      setMockMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong: ${err.message}` }])
    } finally {
      setMockLoading(false)
    }
  }

  // Mock Interview View
  if (mockMode) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex flex-col h-[calc(100vh-60px)]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => { setMockMode(false); setMockMessages([]) }} className="text-white/30 hover:text-white/60 text-xs">← Back</button>
            <h2 className="text-sm font-semibold text-white/80">🎤 Mock Interview: {selectedTopic?.name}</h2>
          </div>
          <span className="text-[10px] text-white/20 px-2 py-1 bg-white/[0.04] rounded-md">AI Interviewer</span>
        </div>

        <div className="flex-1 overflow-auto space-y-3 mb-4 custom-scrollbar">
          {mockMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line
                ${msg.role === 'user'
                  ? 'bg-indigo-500/20 text-indigo-300 rounded-br-md'
                  : 'bg-white/[0.04] text-white/70 rounded-bl-md border border-white/[0.06]'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {mockLoading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.04] rounded-2xl px-4 py-3 border border-white/[0.06]">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <input
            type="text"
            value={mockInput}
            onChange={e => setMockInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMockMessage()}
            placeholder="Type your answer..."
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/30"
          />
          <button onClick={sendMockMessage} disabled={mockLoading}
            className="px-5 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl text-sm font-medium border border-indigo-500/20 transition-all disabled:opacity-40">
            Send
          </button>
        </div>
      </div>
    )
  }

  // Q&A View
  if (selectedTopic && (questions.length > 0 || loadingQ)) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setSelectedTopic(null); setQuestions([]) }} className="text-white/30 hover:text-white/60 text-xs">← Back</button>
          <h2 className="text-lg font-bold text-white">{selectedTopic.icon} {selectedTopic.name}</h2>
        </div>

        {loadingQ ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-white/30 text-sm animate-pulse">Generating interview questions...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                <button
                  onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-indigo-400 font-bold mt-0.5">Q{i + 1}</span>
                    <span className="text-sm text-white/70">{typeof q === 'string' ? q : q.question}</span>
                  </div>
                  <span className={`text-white/20 text-xs transition-transform ${expandedQ === i ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {expandedQ === i && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/[0.04]">
                    <p className="text-xs text-white/50 leading-relaxed whitespace-pre-line">
                      {typeof q === 'string' ? 'Think about this question...' : q.answer}
                    </p>
                    {q.difficulty && (
                      <span className="inline-block mt-2 text-[9px] px-2 py-0.5 bg-white/[0.04] rounded-md text-white/25">{q.difficulty}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Topic Grid
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Interview Preparation</h1>
        <p className="text-sm text-white/30 mt-1">AI-powered questions, answers, and mock interviews</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOPICS.map(topic => (
          <div key={topic.id} className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all group">
            <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">{topic.icon}</span>
            <h3 className="text-sm font-semibold text-white/80 mb-1">{topic.name}</h3>
            <p className="text-[10px] text-white/25 mb-4">{topic.desc}</p>
            <div className="flex gap-2">
              <button
                onClick={() => generateQuestions(topic)}
                className="flex-1 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-[11px] font-medium border border-indigo-500/10 transition-all"
              >
                📝 Questions
              </button>
              <button
                onClick={() => startMock(topic)}
                className="flex-1 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg text-[11px] font-medium border border-violet-500/10 transition-all"
              >
                🎤 Mock
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
