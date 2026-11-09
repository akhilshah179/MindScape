/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react'
import { FileText, Search, AlertTriangle } from 'lucide-react'
import { Modal, Input, Skeleton, EmptyState, Badge, cx, useToast } from '../ui'
import UploadDropzone from './UploadDropzone'
import { getAllFiles } from '../../services/fileApi'

export const formatBytes = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/** Choose one of the user's PDFs (or upload a new one) to use as chat context. */
export default function DocumentPicker({ open, onClose, onSelect, selectedId }) {
  const { toast } = useToast()
  const [files, setFiles] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) return
    let alive = true
    getAllFiles().then(f => alive && setFiles(f)).catch(err => { if (alive) { setFiles([]); toast(err.message, 'error') } })
    return () => { alive = false }
  }, [open, toast])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (files || []).filter(f => !s || f.originalName.toLowerCase().includes(s) || (f.subjectName || '').toLowerCase().includes(s))
  }, [files, q])

  return (
    <Modal open={open} onClose={onClose} title="Chat with a document" description="StudyMate answers from the PDF and cites pages." size="lg">
      <div className="p-6 space-y-5">
        <UploadDropzone subjectName="General"
          onUploaded={(file, message) => { setFiles(prev => [file, ...(prev || [])]); if (file.hasText === false) toast(message, 'info', 7000); else { onSelect(file); onClose() } }}
          onError={(m) => toast(m, 'error')} />
        <Input icon={Search} placeholder="Search your library" value={q} onChange={e => setQ(e.target.value)} />
        <div className="space-y-1.5 max-h-[340px] overflow-y-auto thin-scroll -mx-1 px-1">
          {files === null ? [0, 1, 2].map(i => <Skeleton key={i} className="h-14" />)
            : shown.length === 0 ? <EmptyState icon={FileText} title={files.length ? 'No matches' : 'Your library is empty'} description={files.length ? 'Try a different search.' : 'Upload a PDF above to get started.'} />
              : shown.map(f => (
                <button key={f.fileId} onClick={() => { onSelect(f); onClose() }}
                  className={cx('w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors', f.fileId === selectedId ? 'border-accent/50 bg-accent/5' : 'hover:bg-surface-2')}>
                  <span className="w-9 h-9 rounded-lg bg-bad/10 text-bad flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink truncate">{f.originalName}</span>
                    <span className="block text-xs text-ink-3">{f.subjectName} · {formatBytes(f.size)}{f.numPages ? ` · ${f.numPages} pages` : ''}</span>
                  </span>
                  {f.hasText === false && <Badge tone="warn"><AlertTriangle className="w-3 h-3" />Scanned</Badge>}
                  {f.fileId === selectedId && <Badge tone="accent">Attached</Badge>}
                </button>
              ))}
        </div>
      </div>
    </Modal>
  )
}
