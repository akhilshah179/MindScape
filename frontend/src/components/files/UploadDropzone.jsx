/* eslint-disable react-refresh/only-export-components */
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FileUp, UploadCloud, X } from 'lucide-react'
import { uploadFile } from '../../services/fileApi'
import { cx } from '../ui'

export const MAX_PDF_BYTES = 25 * 1024 * 1024

export function validatePdf(file) {
  if (!file) return 'No file selected.'
  if (!(file.type === 'application/pdf' || /\.pdf$/i.test(file.name))) return `"${file.name}" isn't a PDF.`
  if (file.size > MAX_PDF_BYTES) return `"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB; the limit is 25 MB.`
  if (file.size === 0) return `"${file.name}" is empty.`
  return null
}

/**
 * Native file picker + drag & drop. Uploads files one at a time with real progress
 * and supports cancelling. `compact` renders a button instead of a drop area.
 */
export default function UploadDropzone({ subjectName = 'General', onUploaded, onError, compact = false, className, label = 'Upload PDF' }) {
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [current, setCurrent] = useState(null) // { name, progress }

  const pick = () => {
    if (current) return
    if (inputRef.current) { inputRef.current.value = ''; inputRef.current.click() }
  }

  const handleFiles = async (fileList) => {
    const files = [...(fileList || [])]
    for (const file of files) {
      const problem = validatePdf(file)
      if (problem) { onError?.(problem); continue }
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setCurrent({ name: file.name, progress: 0 })
      try {
        const res = await uploadFile(file, subjectName, (p) => setCurrent(c => c && { ...c, progress: p }), ctrl.signal)
        onUploaded?.(res.file, res.message)
      } catch (err) {
        if (!err.cancelled) onError?.(err.message)
        if (err.cancelled) break
      } finally {
        setCurrent(null)
        abortRef.current = null
      }
    }
  }

  const input = (
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="sr-only" tabIndex={-1}
      onChange={e => handleFiles(e.target.files)} aria-hidden />
  )

  if (compact) {
    return (
      <span className={cx('relative inline-flex', className)}>
        {input}
        <button type="button" onClick={pick} disabled={Boolean(current)}
          className="relative overflow-hidden inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-surface-2 border text-ink hover:bg-surface-3 disabled:cursor-wait">
          {current && <span className="absolute inset-y-0 left-0 bg-accent/20 transition-[width]" style={{ width: `${current.progress}%` }} />}
          <FileUp className="w-3.5 h-3.5 relative" />
          <span className="relative">{current ? `${current.progress}%` : label}</span>
        </button>
        {current && (
          <button onClick={() => abortRef.current?.abort()} className="ml-1 w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-3 hover:text-bad hover:bg-bad/10" aria-label="Cancel upload"><X className="w-3.5 h-3.5" /></button>
        )}
      </span>
    )
  }

  return (
    <div
      className={cx('relative rounded-2xl border-2 border-dashed transition-colors', drag ? 'border-accent bg-accent/5' : 'border-[rgb(var(--line)/0.14)] hover:border-accent/50', className)}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
    >
      {input}
      {current ? (
        <div className="p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm text-ink truncate">Uploading <span className="font-medium">{current.name}</span></p>
            <button onClick={() => abortRef.current?.abort()} className="text-xs text-ink-3 hover:text-bad">Cancel</button>
          </div>
          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <motion.div className="h-full bg-accent-gradient" animate={{ width: `${current.progress}%` }} transition={{ ease: 'easeOut' }} />
          </div>
          <p className="text-xs text-ink-3 mt-2">{current.progress < 100 ? `${current.progress}%` : 'Processing on the server (extracting text)…'}</p>
        </div>
      ) : (
        <button type="button" onClick={pick} className="w-full p-6 flex flex-col items-center text-center gap-2">
          <span className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center"><UploadCloud className="w-5 h-5 text-accent-ink" /></span>
          <span className="text-sm text-ink font-medium">Drop PDFs here or <span className="text-accent-ink">browse</span></span>
          <span className="text-xs text-ink-3">PDF only · up to 25 MB each</span>
        </button>
      )}
    </div>
  )
}
