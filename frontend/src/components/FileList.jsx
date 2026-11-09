import { lazy, Suspense, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AlertTriangle, Download, Eye, FileText, ListChecks, MoreVertical, Sparkles, Trash2 } from 'lucide-react'
import { Badge, ConfirmDialog, EmptyState, IconButton, Skeleton, cx, useToast } from './ui'
// pdf.js is heavy: load the viewer only when a file is opened
const PDFViewer = lazy(() => import('./files/PDFViewer'))
import { formatBytes } from './files/DocumentPicker'
import { deleteFile, downloadFile } from '../services/fileApi'

function Row({ file, onOpen, onDelete }) {
  const { toast } = useToast()
  const [menu, setMenu] = useState(false)
  return (
    <div className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2 transition-colors">
      <button onClick={() => onOpen(file, 'Summary')} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <span className="w-9 h-9 rounded-lg bg-bad/10 text-bad flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
        <span className="min-w-0">
          <span className="block text-sm text-ink truncate">{file.originalName}</span>
          <span className="block text-[11px] text-ink-3">{formatBytes(file.size)}{file.numPages ? ` · ${file.numPages} pages` : ''} · {new Date(file.uploadedAt).toLocaleDateString()}</span>
        </span>
      </button>
      <div className="hidden sm:flex items-center gap-1">
        {file.hasText === false && <Badge tone="warn"><AlertTriangle className="w-3 h-3" />Scanned</Badge>}
        {file.hasSummary && <Badge tone="accent">Summary</Badge>}
      </div>
      <div className="flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <IconButton size="sm" label="View" icon={Eye} onClick={() => onOpen(file, 'Summary')} />
        <IconButton size="sm" label="Quiz" icon={ListChecks} onClick={() => onOpen(file, 'Quiz')} className="hidden sm:inline-flex" />
        <IconButton size="sm" label="Ask AI" icon={Sparkles} onClick={() => onOpen(file, 'Ask')} className="hidden sm:inline-flex" />
        <div className="relative">
          <IconButton size="sm" label="More" icon={MoreVertical} onClick={() => setMenu(m => !m)} />
          {menu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-9 z-30 w-40 glass border shadow-lift rounded-xl p-1" role="menu">
                <button role="menuitem" onClick={() => { setMenu(false); downloadFile(file).catch(e => toast(e.message, 'error')) }} className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs text-ink-2 hover:bg-surface-2"><Download className="w-3.5 h-3.5" />Download</button>
                <button role="menuitem" onClick={() => { setMenu(false); onDelete(file) }} className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs text-bad hover:bg-bad/10"><Trash2 className="w-3.5 h-3.5" />Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Files for one subject. `files` comes from the parent (one request for the whole library). */
export default function FileList({ files, loading, onDeleted, className }) {
  const { toast } = useToast()
  const [viewer, setViewer] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteFile(toDelete.fileId)
      onDeleted?.(toDelete)
      toast(`Deleted "${toDelete.originalName}"`, 'success')
      setToDelete(null)
    } catch (err) {
      toast(`Delete failed: ${err.message}`, 'error')
    } finally { setDeleting(false) }
  }

  return (
    <div className={cx('space-y-0.5', className)}>
      {loading ? [0, 1].map(i => <Skeleton key={i} className="h-14" />)
        : files.length === 0 ? <EmptyState icon={FileText} title="No PDFs yet" description="Upload lecture notes or a textbook chapter." className="py-6" />
          : files.map(f => <Row key={f.fileId} file={f} onOpen={(file, tab) => setViewer({ file, tab })} onDelete={setToDelete} />)}
      <Suspense fallback={null}><AnimatePresence>{viewer && <PDFViewer file={viewer.file} initialTab={viewer.tab} onClose={() => setViewer(null)} />}</AnimatePresence></Suspense>
      <ConfirmDialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} loading={deleting} title="Delete this PDF?" confirmLabel="Delete"
        message={`"${toDelete?.originalName}", its summary and quiz will be permanently deleted.`} onConfirm={confirmDelete} />
    </div>
  )
}
