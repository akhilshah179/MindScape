import { useState } from 'react'
import { Brain, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, ConfirmDialog, EmptyState, Modal, Skeleton } from '../ui'

export default function AIMemoryPanel({ isOpen, onClose, memories, loaded, onSetItem, onDeleteItem, onClearAll }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const add = (e) => {
    e.preventDefault()
    if (!key.trim() || !value.trim()) return
    onSetItem(key, value)
    setKey(''); setValue('')
  }

  return (
    <Modal open={isOpen} onClose={onClose} size="lg" title="What StudyMate remembers"
      description="Personal context used to tailor answers. Learned automatically from chats, or added by you.">
      <div className="p-6 space-y-5">
        <form onSubmit={add} className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-2">
          <input value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. Exam date" maxLength={60} aria-label="Memory name"
            className="h-10 px-3 rounded-xl bg-surface-2 border text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent/50" />
          <input value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 12 December" maxLength={500} aria-label="Memory value"
            className="h-10 px-3 rounded-xl bg-surface-2 border text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent/50" />
          <Button type="submit" icon={Plus} disabled={!key.trim() || !value.trim()}>Add</Button>
        </form>
        <div className="space-y-1.5">
          {!loaded ? [0, 1, 2].map(i => <Skeleton key={i} className="h-12" />)
            : memories.length === 0 ? <EmptyState icon={Brain} title="No memories yet" description="Tell StudyMate about your course, goals or exam dates and it will remember." />
              : memories.map(m => (
                <div key={m.memoryKey} className="group flex items-center gap-3 p-3 rounded-xl border">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-3 capitalize">{m.memoryKey.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-ink break-words">{m.value}</p>
                  </div>
                  {m.source === 'auto' && <Badge tone="accent"><Sparkles className="w-3 h-3" />Learned</Badge>}
                  <button onClick={() => onDeleteItem(m.memoryKey)} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-bad hover:bg-bad/10" aria-label={`Forget ${m.memoryKey}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
        </div>
        {memories.length > 0 && <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>Clear all</Button></div>}
      </div>
      <ConfirmDialog open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear all memory?" confirmLabel="Clear"
        message="StudyMate will forget everything it has learned about you. This can't be undone." onConfirm={() => { onClearAll(); setConfirmClear(false) }} />
    </Modal>
  )
}
