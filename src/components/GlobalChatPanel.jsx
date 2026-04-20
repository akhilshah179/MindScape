import { useState, useRef, useEffect } from 'react'
import { list, getUrl } from 'aws-amplify/storage'
import { getCurrentUser } from 'aws-amplify/auth'
import { extractTextFromPDF } from '../utils/pdfTextExtractor'
import { groqChat } from '../utils/groqClient'

const CHARS_PER_DOC = 800
const MAX_HISTORY = 4

const PERSONAS = {
    'Artificial Intelligence': 'an expert AI professor who explains concepts with real-world examples',
    'Machine Learning': 'a data science mentor who explains ML algorithms with intuitive analogies',
    'Cloud Computing': 'a cloud architect who explains infrastructure with practical use cases',
    'Data Structures': 'a computer science professor who explains DSA with code examples',
    'default': 'a knowledgeable and friendly study assistant',
}

function getPersona(subjects) {
    if (!subjects?.length) return PERSONAS.default
    if (subjects.length === 1) return PERSONAS[subjects[0].name] || PERSONAS.default
    return 'an expert tutor covering ' + subjects.map(s => s.name).join(', ')
}

async function loadAllPdfTexts(userId, subjects) {
    const allTexts = []
    await Promise.all(subjects.map(async (subject) => {
        try {
            const prefix = `private/${userId}/${subject.name}/`
            const result = await list({ path: prefix })
            const pdfs = result.items.filter(i => i.path !== prefix && i.size > 0)
            await Promise.all(pdfs.map(async (file) => {
                try {
                    const fileName = file.path.split('/').pop()
                    const { url } = await getUrl({ path: file.path, options: { expiresIn: 3600 } })
                    const res = await fetch(url.href)
                    const blob = await res.blob()
                    const text = await extractTextFromPDF(new File([blob], fileName, { type: 'application/pdf' }))
                    allTexts.push({ subject: subject.name, fileName, text })
                } catch { /* skip */ }
            }))
        } catch { /* skip */ }
    }))
    return allTexts
}

function buildContext(pdfDocs) {
    if (!pdfDocs?.length) return null
    return pdfDocs
        .map(doc => `[${doc.subject} — ${doc.fileName}]\n${doc.text.slice(0, CHARS_PER_DOC)}`)
        .join('\n\n')
}

function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>')
}

export default function GlobalChatPanel({ subjects }) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([{
        role: 'assistant',
        content: `👋 Hi! I'm your **StudyMate AI**. Ask me anything about your uploaded study materials!`,
    }])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [indexing, setIndexing] = useState(false)
    const [pdfDocs, setPdfDocs] = useState(null)
    const [docCount, setDocCount] = useState(0)
    const [listening, setListening] = useState(false)
    const bottomRef = useRef(null)
    const recogRef = useRef(null)

    const voiceSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
    useEffect(() => { if (isOpen && pdfDocs === null) indexAllDocs() }, [isOpen])

    const indexAllDocs = async () => {
        // FIX: guard against setting state after unmount (e.g. user closes panel mid-fetch)
        let isMounted = true
        setIndexing(true)
        try {
            const user = await getCurrentUser()
            const docs = await loadAllPdfTexts(user.userId, subjects)
            if (!isMounted) return
            setPdfDocs(docs); setDocCount(docs.length)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: docs.length > 0
                    ? `📚 Loaded **${docs.length} PDF${docs.length !== 1 ? 's' : ''}** across your subjects. What would you like to know?`
                    : `📂 No study materials yet. Upload some PDFs and come back!`,
            }])
        } catch (err) {
            if (!isMounted) return
            setMessages(prev => [...prev, { role: 'assistant', content: `Couldn't load materials: ${err.message}` }])
            setPdfDocs([])
        } finally {
            if (isMounted) setIndexing(false)
        }
        return () => { isMounted = false }
    }

    const sendMessage = async (overrideText) => {
        const text = (overrideText ?? input).trim()
        if (!text || loading || indexing) return
        setMessages(prev => [...prev, { role: 'user', content: text }])
        setInput('')
        setLoading(true)
        try {
            const context = buildContext(pdfDocs)
            const persona = getPersona(subjects)
            const history = messages.slice(1).slice(-MAX_HISTORY).map(m => ({ role: m.role, content: m.content }))
            const systemPrompt = context
                ? `You are ${persona}. Answer based on the study materials below. Be concise. Cite which file your answer is from.\n\nMATERIALS:\n${context}`
                : `You are ${persona}. No study materials uploaded yet. Encourage the user to upload PDFs.`
            const reply = await groqChat({
                max_tokens: 512, temperature: 0.5,
                messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: text }],
            })
            setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        } catch (err) {
            const isRate = err.message?.toLowerCase().includes('rate limit') || err.message?.includes('tpm')
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: isRate ? `⏳ Rate limit hit. Wait **60 seconds** and try again.` : `Error: ${err.message}`,
            }])
        } finally { setLoading(false) }
    }

    const toggleVoice = () => {
        if (!voiceSupported) { alert('Voice not supported in this browser.'); return }
        if (listening) { recogRef.current?.stop(); setListening(false); return }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        const r = new SR()
        r.lang = 'en-US'; r.interimResults = false
        r.onresult = (e) => {
            const t = e.results[0][0].transcript
            setInput(t); setListening(false); sendMessage(t)
        }
        r.onerror = r.onend = () => setListening(false)
        r.start(); recogRef.current = r; setListening(true)
    }

    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

    const personaLabel = subjects?.length === 1
        ? `${subjects[0].name} professor`
        : `Tutor for ${subjects?.length || 0} subjects`

    return (
        <div className="mb-8">
            {!isOpen ? (
                <button onClick={() => setIsOpen(true)}
                    className="w-full flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600
            hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl px-5 py-4
            shadow-md hover:shadow-lg transition-all duration-200 group">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div className="text-left flex-1">
                        <p className="font-semibold text-sm">StudyMate AI</p>
                        <p className="text-white/70 text-xs">Ask anything · Voice enabled · Subject-aware</p>
                    </div>
                    <svg className="w-4 h-4 text-white/60 group-hover:text-white transition-colors shrink-0"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            ) : (
                <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden shadow-md">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">StudyMate AI</p>
                            <p className="text-white/60 text-xs truncate">
                                {indexing ? 'Loading materials…'
                                    : docCount > 0 ? `${docCount} PDFs · Acting as ${personaLabel}`
                                        : 'No materials loaded yet'}
                            </p>
                        </div>
                        <button onClick={() => setIsOpen(false)}
                            className="text-white/60 hover:text-white transition-colors text-lg leading-none shrink-0">✕</button>
                    </div>

                    {/* Messages */}
                    <div className="flex flex-col gap-3 p-4 h-80 overflow-y-auto bg-slate-50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center
                    text-violet-600 text-xs font-bold shrink-0 mt-1 mr-2">AI</div>
                                )}
                                <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed
                    ${msg.role === 'user'
                                        ? 'bg-violet-600 text-white rounded-br-sm'
                                        : 'bg-white text-slate-700 rounded-bl-sm border border-slate-100 shadow-sm'}`}
                                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                            </div>
                        ))}
                        {(loading || indexing) && (
                            <div className="flex justify-start">
                                <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center
                  text-violet-600 text-xs font-bold shrink-0 mt-1 mr-2">AI</div>
                                <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100 bg-white">
                        {voiceSupported && (
                            <button onClick={toggleVoice} disabled={loading || indexing} title="Speak your question"
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </button>
                        )}
                        <input type="text" value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={listening ? 'Listening…' : indexing ? 'Loading materials…' : 'Ask anything about your study materials…'}
                            disabled={loading || indexing}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs
                text-slate-700 placeholder-slate-400 focus:outline-none focus:border-violet-400
                focus:ring-1 focus:ring-violet-400 disabled:opacity-50"/>
                        <button onClick={() => sendMessage()} disabled={loading || indexing || !input.trim()}
                            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed
                text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shrink-0">
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
