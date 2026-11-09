import { useEffect, useRef, useState } from 'react'
import { BookMarked, Brain, FileText, MessageSquarePlus, MoreHorizontal, PanelLeftClose, Pencil, Pin, PinOff, Search, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, ConfirmDialog, IconButton, Skeleton, cx } from '../ui'

function ChatRow({ chat, active, onSelect, onRename, onDelete, onPin }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(chat.title)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => setTitle(chat.title), [chat.title])
  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  const commit = () => {
    setEditing(false)
    if (title.trim() && title.trim() !== chat.title) onRename(chat.chatId, title)
    else setTitle(chat.title)
  }

  return (
    <div className={cx('group relative flex items-center rounded-lg transition-colors', active ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>
      {editing ? (
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setTitle(chat.title); setEditing(false) } }}
          className="flex-1 mx-1 my-1 h-8 px-2 rounded-md bg-surface border border-accent/50 text-sm text-ink focus:outline-none" aria-label="Chat title" />
      ) : (
        <button onClick={() => onSelect(chat.chatId)} className="flex-1 min-w-0 flex items-center gap-2 h-9 pl-2.5 pr-8 text-left">
          {chat.fileId ? <FileText className="w-3.5 h-3.5 shrink-0 text-accent-ink/80" /> : chat.isPinned ? <Pin className="w-3.5 h-3.5 shrink-0 text-ink-3" /> : null}
          <span className="truncate text-[13px]">{chat.title || 'New Chat'}</span>
        </button>
      )}
      {!editing && (
        <div ref={menuRef} className="absolute right-1">
          <button onClick={() => setMenu(m => !m)} aria-label="Chat options"
            className={cx('w-7 h-7 rounded-md flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface transition-opacity', menu || active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100')}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
                className="absolute right-0 top-8 z-30 w-40 glass border shadow-lift rounded-xl p-1" role="menu">
                <button role="menuitem" onClick={() => { setMenu(false); setEditing(true) }} className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs text-ink-2 hover:bg-surface-2 hover:text-ink"><Pencil className="w-3.5 h-3.5" />Rename</button>
                <button role="menuitem" onClick={() => { setMenu(false); onPin(chat.chatId) }} className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs text-ink-2 hover:bg-surface-2 hover:text-ink">{chat.isPinned ? <><PinOff className="w-3.5 h-3.5" />Unpin</> : <><Pin className="w-3.5 h-3.5" />Pin</>}</button>
                <button role="menuitem" onClick={() => { setMenu(false); onDelete(chat) }} className="w-full flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs text-bad hover:bg-bad/10"><Trash2 className="w-3.5 h-3.5" />Delete</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default function AISidebar({ chat, onClose, onOpenPromptLibrary, onOpenMemory, className }) {
  const [toDelete, setToDelete] = useState(null)
  return (
    <aside className={cx('w-[272px] shrink-0 h-full flex flex-col border-r bg-surface/70', className)} aria-label="Conversations">
      <div className="p-3 flex items-center gap-2">
        <Button className="flex-1" icon={MessageSquarePlus} onClick={() => { chat.startNewChat(); onClose?.() }}>New chat</Button>
        {onClose && <IconButton label="Close sidebar" icon={onClose.mobile ? X : PanelLeftClose} onClick={onClose} />}
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input value={chat.searchQuery} onChange={e => chat.searchChats(e.target.value)} placeholder="Search chats"
            className="w-full h-9 pl-8 pr-7 rounded-lg bg-surface-2 border text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent/50" aria-label="Search chats" />
          {chat.searchQuery && <button onClick={chat.clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink" aria-label="Clear search"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto thin-scroll px-2 pb-3">
        {!chat.chatsLoaded ? (
          <div className="space-y-1.5 px-1 pt-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
        ) : chat.chats.length === 0 ? (
          <p className="text-xs text-ink-3 px-3 py-6 text-center">{chat.searchQuery ? 'No chats match your search.' : 'Your conversations will appear here.'}</p>
        ) : Object.entries(chat.groupedChats).map(([group, items]) => (
          <div key={group} className="mt-3 first:mt-1">
            <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3">{group}</p>
            {items.map(c => (
              <ChatRow key={c.chatId} chat={c} active={c.chatId === chat.activeChatId}
                onSelect={(id) => { chat.selectChat(id); onClose?.() }}
                onRename={chat.renameChat} onPin={chat.togglePin} onDelete={setToDelete} />
            ))}
          </div>
        ))}
      </div>
      <div className="p-2 border-t grid grid-cols-2 gap-1">
        <button onClick={onOpenPromptLibrary} className="flex items-center justify-center gap-2 h-9 rounded-lg text-xs text-ink-2 hover:bg-surface-2 hover:text-ink"><BookMarked className="w-3.5 h-3.5" />Prompts</button>
        <button onClick={onOpenMemory} className="flex items-center justify-center gap-2 h-9 rounded-lg text-xs text-ink-2 hover:bg-surface-2 hover:text-ink"><Brain className="w-3.5 h-3.5" />Memory</button>
      </div>
      <ConfirmDialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete this chat?" confirmLabel="Delete"
        message={`"${toDelete?.title}" and all its messages will be permanently deleted.`}
        onConfirm={() => { chat.deleteChat(toDelete.chatId); setToDelete(null) }} />
    </aside>
  )
}
