import { useState, useEffect, useRef } from 'react'
import { getUrl } from 'aws-amplify/storage'
import { useNotes } from '../hooks/useNotes'
import { extractTextFromPDF } from '../utils/pdfTextExtractor'
import { groqChat, groqChatWithContext } from '../utils/groqClient'
import { saveQuizScore } from '../hooks/useStudyTracker'

export default function PDFViewer({ filePath, fileName, subjectName, onClose }) {
    const [pdfUrl, setPdfUrl] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    
    // Extracted text
    const [pdfText, setPdfText] = useState('')
    const [isExtracting, setIsExtracting] = useState(false)

    // Notes
    const { notes, addNote } = useNotes(filePath)
    const [noteInput, setNoteInput] = useState('')

    // Active Tab in Sidebar
    const [activeTab, setActiveTab] = useState('Chat') // 'Chat' | 'Quiz' | 'Notes'

    // AI Chat
    const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi! Ask me anything about this document.' }])
    const [chatInput, setChatInput] = useState('')
    const [isChatting, setIsChatting] = useState(false)
    const chatEndRef = useRef(null)

    // Auto-Quiz
    const [quiz, setQuiz] = useState(null)
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
    const [userAnswers, setUserAnswers] = useState({})
    const [quizScore, setQuizScore] = useState(null)

    useEffect(() => {
        let objectUrl = null

        const load = async () => {
            try {
                setLoading(true)
                const { url } = await getUrl({ path: filePath, options: { expiresIn: 3600 } })
                const res = await fetch(url.href)
                const blob = await res.blob()
                objectUrl = URL.createObjectURL(blob)
                setPdfUrl(objectUrl)

                // Extract text for AI
                setIsExtracting(true)
                try {
                    const text = await extractTextFromPDF(new File([blob], fileName, { type: 'application/pdf' }))
                    setPdfText(text)
                } catch (err) {
                    console.error('Text extraction failed:', err)
                } finally {
                    setIsExtracting(false)
                }

            } catch (err) {
                setError('Could not load PDF: ' + err.message)
            } finally {
                setLoading(false)
            }
        }

        load()

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [filePath, fileName])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, activeTab])

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const handleChat = async () => {
        if (!chatInput.trim() || isChatting) return
        const newMsg = chatInput.trim()
        setChatInput('')
        setMessages(prev => [...prev, { role: 'user', content: newMsg }])
        setIsChatting(true)
        
        try {
            const updatedHistory = [
                ...messages.slice(1).map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: newMsg }
            ]
            const reply = await groqChatWithContext(
                pdfText || 'No text could be extracted from this PDF.',
                updatedHistory
            )
            setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
        } finally {
            setIsChatting(false)
        }
    }

    const generateQuiz = async () => {
        if (!pdfText) {
            alert('Wait for document to be extracted or document has no text.')
            return
        }
        setIsGeneratingQuiz(true)
        setQuiz(null)
        setUserAnswers({})
        setQuizScore(null)
        try {
            const prompt = `Based strictly on the following text, generate a JSON array of 3 multiple-choice questions. 
Respond ONLY with raw JSON, nothing else. Format required: 
[{"q":"Question?","options":["A","B","C","D"],"ans":"The exact text of the correct option"}]
\nTEXT:\n${pdfText.slice(0, 3000)}`
            const reply = await groqChat({
                messages: [{ role: 'system', content: prompt }],
                temperature: 0.3,
                max_tokens: 768,
                maxRetries: 3
            })
            const parsed = JSON.parse(reply.replace(/```json/g, '').replace(/```/g, '').trim())
            setQuiz(parsed)
        } catch (err) {
            console.error('Quiz Error:', err)
            alert(`Quiz generation failed: ${err.message || 'Unknown error'}. Please wait a moment and try again.`)
        } finally {
            setIsGeneratingQuiz(false)
        }
    }

    const submitQuiz = () => {
        let score = 0
        const mappedQuestions = []
        const mappedAnswers = {}
        quiz.forEach((q, i) => {
            const isCorrect = userAnswers[i] === q.ans
            if (isCorrect) score++
            mappedQuestions.push({ question: q.q })
            mappedAnswers[i] = { correct: isCorrect }
        })
        setQuizScore(score)
        
        saveQuizScore({
            subjectName: subjectName || 'General',
            fileName,
            score,
            total: quiz.length,
            questions: mappedQuestions,
            answers: mappedAnswers
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex bg-slate-900/95 backdrop-blur-sm">
            
            {/* ── Left: PDF Viewer (70%) ── */}
            <div className="flex-1 flex flex-col h-full border-r border-slate-700 w-2/3 lg:w-[70%] xl:w-[75%]">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">📄</div>
                    <p className="text-white text-sm font-medium flex-1 truncate">{fileName}</p>
                    {pdfUrl && (
                        <a href={pdfUrl} download={fileName} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition">Download</a>
                    )}
                    <button onClick={onClose} className="text-white/70 hover:text-white px-3 py-1 rounded hover:bg-slate-700 transition">✕ Close</button>
                </div>
                <div className="flex-1 overflow-hidden relative bg-slate-100">
                    {loading && <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium">Loading document...</div>}
                    {error && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-medium">{error}</div>}
                    {pdfUrl && <iframe src={pdfUrl} title="PDF Viewer" className="w-full h-full border-none bg-white" />}
                </div>
            </div>

            {/* ── Right: AI Student OS Sidebar (30%) ── */}
            <div className="w-1/3 lg:w-[30%] xl:w-[25%] min-w-[320px] flex flex-col h-full bg-white shrink-0">
                <div className="flex w-full border-b border-slate-100 bg-slate-50 shrink-0">
                    {['Chat', 'Quiz', 'Notes'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3.5 text-sm font-semibold transition-colors 
                            ${activeTab === tab ? 'text-violet-600 border-b-2 border-violet-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>
                            {tab === 'Chat' ? '🤖 AI Chat' : tab === 'Quiz' ? '⚡ Auto-Quiz' : '📝 Notes'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-hidden relative shadow-inner">
                    
                    {/* Chat Tab */}
                    {activeTab === 'Chat' && (
                        <div className="flex flex-col h-full bg-slate-50">
                            {isExtracting && <div className="bg-amber-100 text-amber-800 text-xs text-center py-1.5 font-medium border-b border-amber-200 shadow-sm animate-pulse">Scanning document for AI...</div>}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {m.role === 'assistant' && <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 font-bold text-[10px] flex items-center justify-center mr-2 shrink-0 mt-0.5">AI</div>}
                                        <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm
                                            ${m.role === 'user' ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100'}`}
                                            dangerouslySetInnerHTML={m.role === 'assistant' ? {
                                                __html: m.content
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                                    .replace(/\n/g, '<br/>')
                                            } : undefined}>
                                            {m.role === 'user' ? m.content : null}
                                        </div>
                                    </div>
                                ))}
                                {isChatting && (
                                    <div className="flex items-center text-[10px] text-slate-400 font-medium ml-8 space-x-1">
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: "0.4s"}}></div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="p-3 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <form onSubmit={e => { e.preventDefault(); handleChat() }} className="flex gap-2">
                                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} 
                                        placeholder="Ask about this document..." disabled={isExtracting || isChatting}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-60 transition" />
                                    <button type="submit" disabled={!chatInput.trim() || isChatting || isExtracting}
                                        className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50 transition flex items-center justify-center">
                                        <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Quiz Tab */}
                    {activeTab === 'Quiz' && (
                        <div className="h-full overflow-y-auto bg-slate-50 flex flex-col p-5">
                            {!quiz && !isGeneratingQuiz && (
                                <div className="flex flex-col items-center justify-center flex-1 text-center bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-fade-in my-auto h-fit">
                                    <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">🧠</div>
                                    <h3 className="font-bold text-slate-800 text-lg mb-2">Test Your Knowledge</h3>
                                    <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">StudyMate AI will read this exact document and generate a personalized multiple-choice quiz.</p>
                                    <button onClick={generateQuiz} disabled={isExtracting}
                                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white py-3 rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50 transform hover:-translate-y-0.5 relative overflow-hidden group">
                                        <span className="relative z-10">{isExtracting ? 'Extracting Text...' : 'Generate AI Quiz'}</span>
                                        <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out"></div>
                                    </button>
                                </div>
                            )}

                            {isGeneratingQuiz && (
                                <div className="flex flex-col items-center justify-center flex-1">
                                    <div className="relative w-16 h-16 mb-4">
                                        <div className="absolute inset-0 border-4 border-violet-200 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-violet-600 rounded-full border-t-transparent animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center text-xl">⚡</div>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">Analyzing Document...</p>
                                    <p className="text-xs text-slate-400 mt-1 animate-pulse">Crafting clever questions</p>
                                </div>
                            )}

                            {quiz && (
                                <div className="flex flex-col gap-5 pb-6 animate-fade-in">
                                    {quizScore !== null && (
                                        <div className={`p-5 rounded-2xl text-center shadow-sm border ${quizScore === quiz.length ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-violet-50 border-violet-200 text-violet-800'}`}>
                                            <div className="text-3xl mb-2">{quizScore === quiz.length ? '🏆' : '💪'}</div>
                                            <div className="font-bold text-lg mb-1">Score: {quizScore} / {quiz.length}</div>
                                            <div className="text-xs opacity-80">{quizScore === quiz.length ? 'Perfect score! You mastered this.' : 'Great effort! Keep studying.'}</div>
                                        </div>
                                    )}
                                    {quiz.map((q, i) => (
                                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                            <p className="font-semibold text-slate-800 text-[14px] mb-4 leading-snug"><span className="text-violet-500 mr-1">{i + 1}.</span> {q.q}</p>
                                            <div className="flex flex-col gap-2.5">
                                                {q.options.map((opt, optIdx) => {
                                                    const isSelected = userAnswers[i] === opt
                                                    const isCorrectAns = q.ans === opt
                                                    const showCorrect = quizScore !== null && isCorrectAns
                                                    const showWrong = quizScore !== null && isSelected && !isCorrectAns

                                                    let btnClass = "text-left px-4 py-3 rounded-xl text-[13px] transition-all border flex gap-3 relative overflow-hidden group "
                                                    if (showCorrect) btnClass += "bg-emerald-50 border-emerald-500 text-emerald-900 font-medium shadow-sm"
                                                    else if (showWrong) btnClass += "bg-red-50 border-red-300 text-red-900"
                                                    else if (isSelected) btnClass += "bg-violet-50 border-violet-400 text-violet-900 shadow-sm"
                                                    else btnClass += "bg-white border-slate-200 hover:border-violet-300 hover:bg-slate-50 text-slate-700"

                                                    return (
                                                        <button key={optIdx} disabled={quizScore !== null} onClick={() => setUserAnswers(prev => ({ ...prev, [i]: opt }))} className={btnClass}>
                                                            <div className={`w-5 h-5 rounded-full border flex flex-shrink-0 items-center justify-center transition-colors
                                                                ${showCorrect ? 'bg-emerald-500 border-emerald-500' : showWrong ? 'bg-red-500 border-red-500' : isSelected ? 'bg-violet-500 border-violet-500' : 'border-slate-300 group-hover:border-violet-300 bg-white'}`}>
                                                                {(showCorrect || isSelected || showWrong) && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                            </div>
                                                            <span className="flex-1 pt-0.5 leading-snug">{opt}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {quizScore === null ? (
                                        <button onClick={submitQuiz} disabled={Object.keys(userAnswers).length !== quiz.length}
                                            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl shadow-md transition disabled:opacity-50 mt-2">
                                            Submit Answers
                                        </button>
                                    ) : (
                                        <button onClick={generateQuiz} className="w-full border-2 border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition mt-2">
                                            Generate Another Quiz
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes Tab */}
                    {activeTab === 'Notes' && (
                        <div className="h-full flex flex-col p-5 bg-slate-50">
                            <h3 className="font-bold text-slate-800 mb-1">Personal Notes</h3>
                            <p className="text-xs text-slate-500 mb-4">These notes are saved automatically to this specific PDF.</p>
                            
                            <form onSubmit={e => { e.preventDefault(); if(noteInput.trim()) { addNote(noteInput); setNoteInput('') } }} className="flex gap-2 mb-6">
                                <input value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Type a note..." className="flex-1 px-4 py-2.5 text-[13px] border border-slate-200 focus:border-violet-500 rounded-xl focus:ring-1 focus:ring-violet-500 focus:outline-none transition shadow-sm bg-white" />
                                <button type="submit" disabled={!noteInput.trim()} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50">Add</button>
                            </form>
                            
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
                                {notes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-center opacity-70">
                                        <div className="text-3xl mb-2">✏️</div>
                                        <p className="text-sm font-medium text-slate-500">No notes yet</p>
                                    </div>
                                ) : notes.map((n, i) => (
                                    <div key={i} className="bg-white p-4 text-[13px] text-slate-700 rounded-2xl border border-slate-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)] leading-relaxed relative group">
                                        <div className="absolute w-1 h-full bg-violet-400 left-0 top-0 rounded-l-2xl"></div>
                                        <div className="pl-2">{n.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}