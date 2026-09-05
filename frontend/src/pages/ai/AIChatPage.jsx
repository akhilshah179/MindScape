import { useState, useRef, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'

// ─── Markdown-like renderer ───────────────────────────────────────────────────
function renderContent(text) {
    if (!text) return null
    const lines = text.split('\n')
    const elements = []
    let inCodeBlock = false
    let codeLines = []
    let codeLang = ''

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (line.startsWith('```')) {
            if (inCodeBlock) {
                elements.push(
                    <div key={`code-${i}`} className="ai-code-block">
                        {codeLang && <div className="ai-code-header">{codeLang}</div>}
                        <pre><code>{codeLines.join('\n')}</code></pre>
                    </div>
                )
                codeLines = []
                codeLang = ''
                inCodeBlock = false
            } else {
                inCodeBlock = true
                codeLang = line.slice(3).trim()
            }
            continue
        }

        if (inCodeBlock) {
            codeLines.push(line)
            continue
        }

        // Headings
        if (line.startsWith('### ')) {
            elements.push(<h4 key={i} className="text-sm font-bold text-white/90 mt-3 mb-1">{formatInline(line.slice(4))}</h4>)
        } else if (line.startsWith('## ')) {
            elements.push(<h3 key={i} className="text-sm font-bold text-white/90 mt-3 mb-1">{formatInline(line.slice(3))}</h3>)
        } else if (line.startsWith('# ')) {
            elements.push(<h2 key={i} className="text-base font-bold text-white/90 mt-3 mb-1">{formatInline(line.slice(2))}</h2>)
        }
        // Bullet lists
        else if (line.match(/^[-*]\s/)) {
            elements.push(
                <div key={i} className="ai-list-item">
                    <span className="text-[13px] text-white/70 leading-relaxed">{formatInline(line.slice(2))}</span>
                </div>
            )
        }
        // Numbered lists
        else if (line.match(/^\d+\.\s/)) {
            const num = line.match(/^(\d+)\./)[1]
            elements.push(
                <div key={i} className="ai-ordered-item">
                    <span className="text-violet-400/60 text-xs font-semibold shrink-0 mt-0.5 w-4">{num}.</span>
                    <span className="text-[13px] text-white/70 leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ''))}</span>
                </div>
            )
        }
        // Empty lines
        else if (line.trim() === '') {
            elements.push(<div key={i} className="h-2" />)
        }
        // Regular text
        else {
            elements.push(<p key={i} className="text-[13px] text-white/70 leading-relaxed">{formatInline(line)}</p>)
        }
    }

    return elements
}

function formatInline(text) {
    const parts = []
    let remaining = text
    let key = 0

    while (remaining.length > 0) {
        // Bold
        const boldMatch = remaining.match(/\*\*(.*?)\*\*/)
        // Inline code
        const codeMatch = remaining.match(/`([^`]+)`/)

        let firstMatch = null
        let firstIndex = Infinity

        if (boldMatch && remaining.indexOf(boldMatch[0]) < firstIndex) {
            firstMatch = { type: 'bold', match: boldMatch, index: remaining.indexOf(boldMatch[0]) }
            firstIndex = firstMatch.index
        }
        if (codeMatch && remaining.indexOf(codeMatch[0]) < firstIndex) {
            firstMatch = { type: 'code', match: codeMatch, index: remaining.indexOf(codeMatch[0]) }
            firstIndex = firstMatch.index
        }

        if (!firstMatch) {
            parts.push(<span key={key++}>{remaining}</span>)
            break
        }

        if (firstMatch.index > 0) {
            parts.push(<span key={key++}>{remaining.slice(0, firstMatch.index)}</span>)
        }

        if (firstMatch.type === 'bold') {
            parts.push(<strong key={key++} className="text-white/90 font-semibold">{firstMatch.match[1]}</strong>)
        } else if (firstMatch.type === 'code') {
            parts.push(<code key={key++} className="ai-inline-code">{firstMatch.match[1]}</code>)
        }

        remaining = remaining.slice(firstMatch.index + firstMatch.match[0].length)
    }

    return parts
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="flex items-center gap-1.5 px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ animation: 'typingPulse 1.4s infinite', animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ animation: 'typingPulse 1.4s infinite', animationDelay: '200ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ animation: 'typingPulse 1.4s infinite', animationDelay: '400ms' }} />
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AIChatPage() {
    const { user, chatHook, promptToInsert, setPromptToInsert, pdfContext, setPdfContext } = useOutletContext()
    const [input, setInput] = useState('')
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    const { messages, activeChatId, isSending, isLoading, sendMessage, createChat } = chatHook

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isSending])

    // Handle prompt insertion from library
    useEffect(() => {
        if (promptToInsert) {
            setInput(promptToInsert)
            setPromptToInsert('')
            inputRef.current?.focus()
        }
    }, [promptToInsert])

    const handleSend = async () => {
        const text = input.trim()
        if (!text || isSending) return

        const contextText = typeof pdfContext === 'string' ? pdfContext : pdfContext?.text || null
        const fileId = typeof pdfContext === 'object' ? pdfContext?.fileId : null
        const fileName = typeof pdfContext === 'object' ? pdfContext?.fileName : null

        setInput('')
        if (pdfContext) setPdfContext(null)
        await sendMessage(text, contextText, fileId, fileName)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // ── Empty state (no chat selected) ────────────────────────────────────────
    if (!activeChatId && messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className="max-w-lg text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 flex items-center justify-center mx-auto mb-6 border border-violet-500/10">
                        <span className="text-2xl">✦</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white/90 mb-2">StudyMate AI</h1>
                    <p className="text-white/40 text-sm mb-8 leading-relaxed">
                        Your intelligent study companion. Ask questions, analyze documents, generate quizzes, and get personalized learning assistance.
                    </p>

                    {/* Quick prompts */}
                    <div className="grid grid-cols-2 gap-2 max-w-md mx-auto mb-8">
                        {[
                            { icon: '📖', label: 'Explain a concept', prompt: 'Explain the concept of ' },
                            { icon: '📝', label: 'Generate a quiz', prompt: 'Generate a quiz about ' },
                            { icon: '📋', label: 'Summarize a topic', prompt: 'Summarize the key points of ' },
                            { icon: '🎯', label: 'Practice problems', prompt: 'Give me practice problems for ' },
                        ].map(({ icon, label, prompt }) => (
                            <button
                                key={label}
                                onClick={() => { setInput(prompt); inputRef.current?.focus() }}
                                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-violet-500/10 hover:border-violet-500/20 text-left transition-all duration-200 group"
                            >
                                <span className="text-base">{icon}</span>
                                <span className="text-xs text-white/50 group-hover:text-white/70 font-medium">{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything..."
                            className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/25 focus:outline-none"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isSending}
                            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── Chat view ─────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-4">
                    {messages.map((msg, i) => (
                        <div
                            key={msg.messageId || i}
                            className={`flex gap-3 ai-message-animate ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-1 shadow-sm shadow-violet-500/20">
                                    ✦
                                </div>
                            )}
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                    msg.role === 'user'
                                        ? 'bg-violet-600/80 text-white rounded-br-sm'
                                        : 'bg-white/[0.04] border border-white/[0.06] rounded-bl-sm ai-chat-response'
                                }`}
                            >
                                {msg.role === 'user' ? (
                                    <p className="text-[13px] leading-relaxed">{msg.content}</p>
                                ) : (
                                    <div className="space-y-1">{renderContent(msg.content)}</div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isSending && (
                        <div className="flex gap-3 ai-message-animate">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-1">
                                ✦
                            </div>
                            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm">
                                <TypingIndicator />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* PDF context badge */}
            {pdfContext && (
                <div className="px-4 sm:px-6">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl mb-2">
                            <span className="text-xs">📄</span>
                            <span className="text-xs text-violet-300 font-medium flex-1 truncate">
                                Context attached: {typeof pdfContext === 'object' && pdfContext.fileName ? pdfContext.fileName : 'Document text'}
                            </span>
                            <button onClick={() => setPdfContext(null)} className="text-white/30 hover:text-white/60 text-xs">✕</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Input bar */}
            <div className="px-4 sm:px-6 py-4 bg-[#0a0a0f] border-t border-white/[0.04]">
                <div className="max-w-3xl mx-auto flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 focus-within:border-violet-500/30 transition-colors">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/25 focus:outline-none resize-none min-h-[20px] max-h-[120px]"
                            style={{ height: 'auto' }}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 shrink-0 shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30"
                    >
                        {isSending ? '...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    )
}
