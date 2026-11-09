import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import AISidebar from '../../components/ai/AISidebar'
import PromptLibrary from '../../components/ai/PromptLibrary'
import AIMemoryPanel from '../../components/ai/AIMemoryPanel'
import DocumentPicker from '../../components/files/DocumentPicker'
import { useAIChat } from '../../hooks/ai/useAIChat'
import { useAIMemory } from '../../hooks/ai/useAIMemory'
import { useToast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function StudyMateAI() {
  const { user } = useAuth()
  const { toast } = useToast()
  const onError = useCallback((m) => toast(m, 'error'), [toast])
  const chat = useAIChat({ onError })
  const memory = useAIMemory({ onError })

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [promptsOpen, setPromptsOpen] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [promptToInsert, setPromptToInsert] = useState('')

  const closeMobile = Object.assign(() => setMobileOpen(false), { mobile: true })

  return (
    <div className="h-full flex overflow-hidden">
      {/* desktop sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div className="hidden lg:block h-full overflow-hidden" initial={{ width: 0 }} animate={{ width: 272 }} exit={{ width: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 300 }}>
            <AISidebar chat={chat} onClose={() => setSidebarOpen(false)} onOpenPromptLibrary={() => setPromptsOpen(true)} onOpenMemory={() => setMemoryOpen(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="lg:hidden fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <motion.div className="relative h-full bg-surface" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}>
              <AISidebar chat={chat} onClose={closeMobile} onOpenPromptLibrary={() => { setPromptsOpen(true); setMobileOpen(false) }} onOpenMemory={() => { setMemoryOpen(true); setMobileOpen(false) }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 h-full flex flex-col">
        <Outlet context={{
          user, chat, promptToInsert, setPromptToInsert,
          sidebarOpen, openSidebar: () => setSidebarOpen(true), openMobileSidebar: () => setMobileOpen(true),
          openDocuments: () => setDocsOpen(true)
        }} />
      </main>

      <PromptLibrary isOpen={promptsOpen} onClose={() => setPromptsOpen(false)} onSelectPrompt={setPromptToInsert} />
      <AIMemoryPanel isOpen={memoryOpen} onClose={() => setMemoryOpen(false)} memories={memory.memories} loaded={memory.loaded}
        onSetItem={memory.setMemoryItem} onDeleteItem={memory.deleteMemoryItem} onClearAll={memory.clearAll} />
      <DocumentPicker open={docsOpen} onClose={() => setDocsOpen(false)} selectedId={chat.attachedFile?.fileId} onSelect={chat.attachFile} />
    </div>
  )
}
