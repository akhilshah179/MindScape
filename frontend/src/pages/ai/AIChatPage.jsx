import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUp, BookOpen, FileText, ListChecks, Menu, PanelLeftOpen, Paperclip, RotateCcw, Sparkles, Square, Target, X, AlertCircle } from 'lucide-react'
import Markdown from '../../components/ai/Markdown'
import { IconButton, Skeleton, cx } from '../../components/ui'

const STARTERS = [
  { icon: BookOpen, label: 'Explain a concept', prompt: 'Explain the concept of ' },
  { icon: ListChecks, label: 'Quiz me', prompt: 'Give me 5 practice questions on ' },
  { icon: FileText, label: 'Summarise a topic', prompt: 'Summarise the key points of ' },
  { icon: Target, label: 'Make a study plan', prompt: 'Make me a 7-day study plan for ' },
]

function Composer({ value, onChange, onSend, onStop, sending, attachedFile, onAttach, onDetach, inputRef, autoFocus }) {
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value, inputRef])
  return (
    <div className="rounded-2xl border bg-surface shadow-card focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10 transition-all">
      {attachedFile && (
        <div className="px-3 pt-3">
          <span className="inline-flex items-center gap-2 max-w-full pl-2.5 pr-1 h-8 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent-ink">
            <FileText className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{attachedFile.fileName}</span>
            <button onClick={onDetach} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-accent/15" aria-label="Detach document"><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}
      <textarea
        ref={inputRef}
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSend() } }}
        placeholder={attachedFile ? `Ask about ${attachedFile.fileName}…` : 'Ask StudyMate anything…'}
        rows={1}
        maxLength={8000}
        aria-label="Message"
        className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
      />
      <div className="flex items-center justify-between px-2.5 pb-2.5">
        <button onClick={onAttach} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs text-ink-3 hover:text-ink hover:bg-surface-2" title="Chat with a PDF">
          <Paperclip className="w-4 h-4" /><span className="hidden sm:inline">{attachedFile ? 'Change document' : 'Attach PDF'}</span>
        </button>
        {sending ? (
          <button onClick={onStop} className="w-9 h-9 rounded-xl bg-surface-3 text-ink flex items-center justify-center hover:bg-[rgb(var(--line)/0.15)]" aria-label="Stop generating"><Square className="w-3.5 h-3.5 fill-current" /></button>
        ) : (
          <button onClick={onSend} disabled={!value.trim()} className="w-9 h-9 rounded-xl bg-accent-gradient text-white flex items-center justify-center shadow-glow disabled:opacity-30 disabled:shadow-none transition-opacity" aria-label="Send message"><ArrowUp className="w-4 h-4" /></button>
        )}
      </div>
    </div>
  )
}

function Message({ m, onRetry }) {
  if (m.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1 ai-message-animate">
        <div className={cx('max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words', m.failed ? 'bg-bad/10 text-ink border border-bad/20' : 'bg-accent text-white')}>{m.content}</div>
        {m.failed && (
          <div className="flex items-center gap-2 text-xs text-bad">
            <AlertCircle className="w-3.5 h-3.5" />{m.error === 'Stopped' ? 'Stopped' : 'Not sent'}
            <button onClick={() => onRetry(m)} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink underline-offset-2 hover:underline"><RotateCcw className="w-3 h-3" />Retry</button>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="flex gap-3 ai-message-animate">
      <span className="w-7 h-7 rounded-lg bg-accent-gradient flex items-center justify-center shrink-0 mt-0.5 shadow-glow"><Sparkles className="w-3.5 h-3.5 text-white" /></span>
      <div className="min-w-0 flex-1 pt-0.5">
        {m.streaming && !m.content
          ? <div className="flex items-center gap-1.5 h-6">{[0, 200, 400].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-accent" style={{ animation: 'typingPulse 1.4s infinite', animationDelay: `${d}ms` }} />)}</div>
          : <Markdown text={m.content} streaming={m.streaming} />}
        {m.metadata?.usedDocument && !m.streaming && <p className="mt-2 text-[11px] text-ink-3 inline-flex items-center gap-1"><FileText className="w-3 h-3" />Answered from your document</p>}
      </div>
    </div>
  )
}

export default function AIChatPage() {
  const { user, chat, promptToInsert, setPromptToInsert, sidebarOpen, openSidebar, openMobileSidebar, openDocuments } = useOutletContext()
  const [input, setInput] = useState('')
  const inputRef = useRef(null)
  const scrollRef = useRef(null)
  const stickToBottom = useRef(true)

  const { messages, activeChat, activeChatId, isLoading, isSending, attachedFile } = chat

  useEffect(() => {
    if (promptToInsert) { setInput(promptToInsert); setPromptToInsert(''); inputRef.current?.focus() }
  }, [promptToInsert, setPromptToInsert])

  // Focus composer when switching chats
  useEffect(() => { inputRef.current?.focus(); stickToBottom.current = true }, [activeChatId])

  // Follow the stream only if the user hasn't scrolled up
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = () => {
    const text = input.trim()
    if (!text || isSending) return
    setInput('')
    stickToBottom.current = true
    chat.sendMessage(text)
  }

  const header = (
    <div className="h-14 shrink-0 flex items-center gap-2 px-3 sm:px-4 border-b">
      <IconButton className="lg:hidden" label="Open chats" icon={Menu} onClick={openMobileSidebar} />
      {!sidebarOpen && <IconButton className="hidden lg:inline-flex" label="Open sidebar" icon={PanelLeftOpen} onClick={openSidebar} />}
      <h1 className="text-sm font-medium text-ink truncate flex-1">{activeChat?.title || 'New chat'}</h1>
      {attachedFile && <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-ink-3 truncate max-w-[40%]"><FileText className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{attachedFile.fileName}</span></span>}
    </div>
  )

  const composer = (
    <Composer value={input} onChange={setInput} onSend={send} onStop={chat.stop} sending={isSending} inputRef={inputRef}
      attachedFile={attachedFile} onAttach={openDocuments} onDetach={() => chat.attachFile(null)} autoFocus />
  )

  if (!activeChatId) {
    return (
      <div className="h-full flex flex-col">
        {header}
        <div className="flex-1 overflow-y-auto thin-scroll">
          <div className="min-h-full flex flex-col items-center justify-center px-4 sm:px-6 py-10">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
              <div className="text-center mb-8">
                <span className="inline-flex w-12 h-12 rounded-2xl bg-accent-gradient shadow-glow items-center justify-center mb-5"><Sparkles className="w-5 h-5 text-white" /></span>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Hi {user?.name?.split(' ')[0] || 'there'}, what are we learning today?</h2>
                <p className="text-ink-3 text-sm mt-2">Ask anything, or attach a PDF and get answers with page citations.</p>
              </div>
              {composer}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {STARTERS.map(s => (
                  <button key={s.label} onClick={() => { setInput(s.prompt); inputRef.current?.focus() }}
                    className="flex flex-col items-start gap-2 p-3 rounded-xl border bg-surface/50 hover:bg-surface-2 hover:border-accent/30 text-left transition-colors">
                    <s.icon className="w-4 h-4 text-accent-ink" /><span className="text-xs text-ink-2 font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {header}
      <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scroll"
        onScroll={e => { const el = e.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {isLoading ? (
            <div className="space-y-6">{[0, 1].map(i => (<div key={i} className="space-y-3"><Skeleton className="h-10 w-1/2 ml-auto" /><Skeleton className="h-24 w-5/6" /></div>))}</div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-ink-3 py-16">Send a message to start this conversation.</p>
          ) : messages.map(m => <Message key={m.messageId} m={m} onRetry={chat.retry} />)}
        </div>
      </div>
      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">
          {composer}
          <p className="text-[11px] text-ink-3 text-center mt-2">StudyMate can make mistakes. Check important facts against your course material.</p>
        </div>
      </div>
    </div>
  )
}
