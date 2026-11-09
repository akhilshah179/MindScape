import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowUp, Download, ExternalLink, FileText, ListChecks, MessageSquare, Minus, Plus, RefreshCw, Sparkles, X } from 'lucide-react'
import PdfCanvas, { usePdfDocument } from './PdfCanvas'
import QuizRunner from './QuizRunner'
import Markdown from '../ai/Markdown'
import { Button, EmptyState, IconButton, Segmented, Skeleton, Spinner, cx, useToast } from '../ui'
import { downloadFile, generateFileQuiz, generateFileSummary, getFileQuiz, getFileSummary } from '../../services/fileApi'
import * as chatApi from '../../services/ai/chatApi'

function SummaryTab({ file }) {
  const { toast } = useToast()
  const [summary, setSummary] = useState(undefined)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    getFileSummary(file.fileId).then(s => alive && setSummary(s)).catch(err => { if (alive) { setSummary(null); toast(err.message, 'error') } })
    return () => { alive = false }
  }, [file.fileId, toast])
  const generate = async (force) => {
    setBusy(true)
    try { setSummary((await generateFileSummary(file.fileId, null, force)).summary) } catch (err) { toast(err.message, 'error') } finally { setBusy(false) }
  }
  if (summary === undefined) return <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4" />)}</div>
  if (file.hasText === false) return <EmptyState icon={AlertTriangle} title="No selectable text" description="This PDF looks like scanned images. OCR is needed before it can be summarised." />
  if (!summary) return (
    <EmptyState icon={Sparkles} title="No summary yet" description="Generate a structured study guide from this document. It's saved for next time."
      action={<Button icon={Sparkles} loading={busy} onClick={() => generate(false)}>{busy ? 'Summarising…' : 'Generate summary'}</Button>} />
  )
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-ink-3">Saved {new Date(summary.updatedAt || summary.createdAt).toLocaleString()}</p>
        <Button variant="ghost" size="sm" icon={RefreshCw} loading={busy} onClick={() => generate(true)}>Regenerate</Button>
      </div>
      <Markdown text={summary.summary} />
    </div>
  )
}

function QuizTab({ file }) {
  const { toast } = useToast()
  const [quiz, setQuiz] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    let alive = true
    getFileQuiz(file.fileId).then(q => alive && setQuiz(q)).catch(err => { if (alive) { setQuiz(null); toast(err.message, 'error') } })
    return () => { alive = false }
  }, [file.fileId, toast])
  const generate = async (force) => {
    setBusy(true)
    try { setQuiz((await generateFileQuiz(file.fileId, null, force)).quiz); setRunning(true) } catch (err) { toast(err.message, 'error') } finally { setBusy(false) }
  }
  if (quiz === undefined) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
  if (file.hasText === false) return <EmptyState icon={AlertTriangle} title="No selectable text" description="This PDF looks like scanned images, so a quiz can't be generated." />
  if (running && quiz) return <QuizRunner quiz={quiz} fileId={file.fileId} fileName={file.originalName} />
  return (
    <EmptyState icon={ListChecks} title={quiz ? `${quiz.questions.length}-question quiz ready` : 'Test yourself'}
      description={quiz ? 'Questions are drawn from across the whole document. Your score is saved to Analytics.' : 'Generate multiple-choice questions from this document.'}
      action={<div className="flex gap-2 justify-center">
        {quiz && <Button onClick={() => setRunning(true)}>Start quiz</Button>}
        <Button variant={quiz ? 'secondary' : 'primary'} icon={quiz ? RefreshCw : Sparkles} loading={busy} onClick={() => generate(Boolean(quiz))}>{quiz ? 'New questions' : 'Generate quiz'}</Button>
      </div>} />
  )
}

/** Ask questions about this document. Uses a persisted StudyMate chat attached to the file. */
function AskTab({ file }) {
  const { toast } = useToast()
  const [chatId, setChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages])

  const send = async () => {
    const content = input.trim()
    if (!content || sending) return
    setInput('')
    setSending(true)
    const temp = { id: `a${Date.now()}`, role: 'assistant', content: '', streaming: true }
    setMessages(m => [...m, { id: `u${Date.now()}`, role: 'user', content }, temp])
    try {
      let id = chatId
      if (!id) { id = (await chatApi.createChat(null, { fileId: file.fileId, title: `About ${file.originalName}` })).chatId; setChatId(id) }
      let buf = ''
      const res = await chatApi.sendMessage(id, { content, onToken: t => { buf += t; setMessages(m => m.map(x => (x.id === temp.id ? { ...x, content: buf } : x))) } })
      setMessages(m => m.map(x => (x.id === temp.id ? { ...x, content: res.reply, streaming: false } : x)))
    } catch (err) {
      setMessages(m => m.filter(x => x.id !== temp.id))
      setInput(content)
      toast(err.message, 'error')
    } finally { setSending(false) }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto thin-scroll space-y-5 pb-4">
        {messages.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Ask about this document" description="Answers come from the PDF with page citations."
            action={<div className="flex flex-wrap gap-2 justify-center">{['What are the key ideas?', 'Explain the hardest concept simply', 'Give me 3 exam-style questions'].map(s => (
              <button key={s} onClick={() => setInput(s)} className="text-xs px-3 h-8 rounded-lg border hover:bg-surface-2 text-ink-2">{s}</button>))}</div>} />
        ) : messages.map(m => m.role === 'user'
          ? <div key={m.id} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 bg-accent text-white text-sm whitespace-pre-wrap">{m.content}</div></div>
          : <div key={m.id}>{m.streaming && !m.content ? <Spinner className="w-4 h-4" /> : <Markdown text={m.content} streaming={m.streaming} />}</div>)}
        <div ref={endRef} />
      </div>
      {chatId && <Link to={`/ai/chat/${chatId}`} className="text-xs text-accent-ink inline-flex items-center gap-1 mb-2 hover:underline"><ExternalLink className="w-3 h-3" />Continue in StudyMate AI</Link>}
      <div className="flex items-end gap-2 rounded-xl border bg-surface-2 p-1.5 focus-within:border-accent/50">
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={1} placeholder="Ask a question…" aria-label="Question"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none max-h-32" />
        <button onClick={send} disabled={!input.trim() || sending} aria-label="Send" className="w-8 h-8 rounded-lg bg-accent-gradient text-white flex items-center justify-center disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

export default function PDFViewer({ file, initialTab = 'Summary', onClose }) {
  const { toast } = useToast()
  const { doc, error, loading } = usePdfDocument(file.fileId)
  const [scale, setScale] = useState(null)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState(initialTab)
  const [mobileView, setMobileView] = useState('pdf')
  const scrollRef = useRef(null)

  // Fit-to-width initial zoom
  useEffect(() => {
    if (!doc || scale) return
    doc.getPage(1).then(p => {
      const w = p.getViewport({ scale: 1 }).width
      const avail = (scrollRef.current?.clientWidth || 800) - 48
      setScale(Math.max(0.5, Math.min(2, avail / w)))
    })
  }, [doc, scale])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const onPageChange = useCallback((n) => setPage(n), [])
  const zoom = (d) => setScale(s => Math.max(0.5, Math.min(3, +(s + d).toFixed(2))))

  return createPortal(
    <motion.div className="fixed inset-0 z-[90] bg-canvas flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={file.originalName}>
      <header className="h-14 shrink-0 border-b flex items-center gap-2 px-3 sm:px-4">
        <span className="w-8 h-8 rounded-lg bg-bad/10 text-bad flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink truncate">{file.originalName}</p>
          <p className="text-[11px] text-ink-3">{file.subjectName}{doc ? ` · page ${page} of ${doc.numPages}` : ''}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1 mr-1">
          <IconButton label="Zoom out" icon={Minus} size="sm" onClick={() => zoom(-0.15)} disabled={!scale} />
          <span className="text-xs text-ink-2 w-11 text-center tabular-nums">{scale ? `${Math.round(scale * 100)}%` : '—'}</span>
          <IconButton label="Zoom in" icon={Plus} size="sm" onClick={() => zoom(0.15)} disabled={!scale} />
        </div>
        <IconButton label="Download" icon={Download} onClick={() => downloadFile(file).catch(err => toast(err.message, 'error'))} />
        <IconButton label="Close" icon={X} onClick={onClose} />
      </header>
      <div className="lg:hidden border-b px-3 py-2"><Segmented layoutId="pdf-mobile" value={mobileView} onChange={setMobileView} options={[{ value: 'pdf', label: 'Document' }, { value: 'study', label: 'Study tools' }]} /></div>
      <div className="flex-1 min-h-0 flex">
        <div ref={scrollRef} className={cx('flex-1 min-w-0 overflow-auto thin-scroll bg-surface-2/60', mobileView !== 'pdf' && 'hidden lg:block')}>
          {loading ? <div className="h-full flex items-center justify-center"><Spinner /></div>
            : error ? <EmptyState icon={AlertTriangle} title="Couldn't open this PDF" description={error} className="h-full" />
              : scale && <PdfCanvas doc={doc} scale={scale} onPageChange={onPageChange} />}
        </div>
        <aside className={cx('w-full lg:w-[420px] xl:w-[460px] shrink-0 border-l bg-surface flex flex-col min-h-0', mobileView !== 'study' && 'hidden lg:flex')}>
          <div className="p-3 border-b"><Segmented layoutId="pdf-tab" value={tab} onChange={setTab} options={['Summary', 'Quiz', 'Ask']} className="w-full [&>button]:flex-1" /></div>
          <div className={cx('flex-1 min-h-0 p-5', tab === 'Ask' ? 'flex flex-col' : 'overflow-y-auto thin-scroll')}>
            {/* keep tabs mounted so switching doesn't refetch or lose quiz progress */}
            <div className={tab === 'Summary' ? '' : 'hidden'}><SummaryTab file={file} /></div>
            <div className={tab === 'Quiz' ? '' : 'hidden'}><QuizTab file={file} /></div>
            <div className={tab === 'Ask' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}><AskTab file={file} /></div>
          </div>
        </aside>
      </div>
    </motion.div>,
    document.body
  )
}
