import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { getAuthUser } from '../../utils/auth'
import AISidebar from '../../components/ai/AISidebar'
import PromptLibrary from '../../components/ai/PromptLibrary'
import AIMemoryPanel from '../../components/ai/AIMemoryPanel'
import PDFChatPanel from '../../components/ai/PDFChatPanel'
import { useAIChat } from '../../hooks/ai/useAIChat'
import { useAIMemory } from '../../hooks/ai/useAIMemory'

export default function StudyMateAI() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const [showPromptLibrary, setShowPromptLibrary] = useState(false)
    const [showMemoryPanel, setShowMemoryPanel] = useState(false)
    const [showPDFPanel, setShowPDFPanel] = useState(false)
    const [pdfContext, setPdfContext] = useState(null)
    const [promptToInsert, setPromptToInsert] = useState('')

    // Load user
    useEffect(() => {
        const loadUser = async () => {
            try {
                const u = await getAuthUser()
                setUser({
                    userId: u.userId,
                    name: u.name,
                    email: u.email,
                })
            } catch (err) {
                console.error('Failed to load user:', err)
            } finally {
                setLoading(false)
            }
        }
        loadUser()
    }, [])

    // Initialize hooks after user loads
    const chatHook = useAIChat(user?.userId)
    const memoryHook = useAIMemory(user?.userId)

    // Handle prompt from library
    const handlePromptSelect = (template) => {
        setPromptToInsert(template)
        // Will be consumed by AIChatPage via outlet context
    }

    // Handle PDF submission
    const handlePDFSubmit = async (prompt, extractedText, fileId = null, fileName = null) => {
        setPdfContext({ text: extractedText, fileId, fileName })
        let chatId = chatHook.activeChatId
        if (!chatId) {
            chatId = await chatHook.createChat({
                title: fileName ? `PDF: ${fileName}` : 'PDF Chat',
                fileId,
                fileName
            })
            if (!chatId) return
            await new Promise(r => setTimeout(r, 100))
        }
        await chatHook.sendMessage(prompt, extractedText, fileId, fileName)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 animate-pulse" />
                        <div className="absolute inset-0 rounded-xl border-2 border-transparent border-t-violet-500 animate-spin" />
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-violet-400">✦</span>
                    </div>
                    <p className="text-white/30 text-sm">Loading StudyMate AI...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen bg-[#0a0a0f] text-white flex overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex">
                <AISidebar
                    chats={chatHook.chats}
                    groupedChats={chatHook.groupedChats}
                    activeChatId={chatHook.activeChatId}
                    searchQuery={chatHook.searchQuery}
                    isSearching={chatHook.isSearching}
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(c => !c)}
                    onCreateChat={chatHook.startNewChat}
                    onSelectChat={(id) => { chatHook.selectChat(id); setMobileNavOpen(false) }}
                    onRenameChat={chatHook.renameChat}
                    onDeleteChat={chatHook.deleteChat}
                    onSearch={chatHook.searchChats}
                    onClearSearch={chatHook.clearSearch}
                    onOpenPromptLibrary={() => setShowPromptLibrary(true)}
                    onOpenMemory={() => setShowMemoryPanel(true)}
                />
            </div>

            {/* Mobile nav overlay */}
            {mobileNavOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
                    <div className="w-72 h-full" onClick={e => e.stopPropagation()}>
                        <AISidebar
                            chats={chatHook.chats}
                            groupedChats={chatHook.groupedChats}
                            activeChatId={chatHook.activeChatId}
                            searchQuery={chatHook.searchQuery}
                            isSearching={chatHook.isSearching}
                            collapsed={false}
                            onCreateChat={chatHook.startNewChat}
                            onSelectChat={(id) => { chatHook.selectChat(id); setMobileNavOpen(false) }}
                            onRenameChat={chatHook.renameChat}
                            onDeleteChat={chatHook.deleteChat}
                            onSearch={chatHook.searchChats}
                            onClearSearch={chatHook.clearSearch}
                            onOpenPromptLibrary={() => { setShowPromptLibrary(true); setMobileNavOpen(false) }}
                            onOpenMemory={() => { setShowMemoryPanel(true); setMobileNavOpen(false) }}
                        />
                    </div>
                </div>
            )}

            {/* Main content */}
            <main className="flex-1 h-screen flex flex-col overflow-hidden">
                {/* Mobile top bar */}
                <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#08080d] border-b border-white/[0.06]">
                    <button onClick={() => setMobileNavOpen(true)} className="text-white/50 hover:text-white/70 text-xl">☰</button>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-[8px] font-bold">✦</div>
                        <span className="text-sm font-semibold text-white/80">StudyMate AI</span>
                    </div>
                    <button
                        onClick={() => setShowPDFPanel(true)}
                        className="text-white/40 hover:text-white/70 text-sm"
                        title="Upload PDF"
                    >📄</button>
                </div>

                {/* Desktop floating PDF button */}
                <button
                    onClick={() => setShowPDFPanel(true)}
                    className="hidden md:flex fixed bottom-24 right-6 z-30 items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-violet-500/10 hover:border-violet-500/20 text-white/50 hover:text-white/80 text-xs font-medium transition-all duration-200 backdrop-blur-sm shadow-lg group"
                >
                    <span className="text-sm group-hover:scale-110 transition-transform">📄</span>
                    Chat with PDF
                </button>

                <Outlet context={{ user, chatHook, promptToInsert, setPromptToInsert, pdfContext, setPdfContext }} />
            </main>

            {/* Modals */}
            <PromptLibrary
                isOpen={showPromptLibrary}
                onClose={() => setShowPromptLibrary(false)}
                onSelectPrompt={handlePromptSelect}
            />

            <AIMemoryPanel
                isOpen={showMemoryPanel}
                onClose={() => setShowMemoryPanel(false)}
                memories={memoryHook.memories}
                onSetItem={memoryHook.setMemoryItem}
                onDeleteItem={memoryHook.deleteMemoryItem}
                onClearAll={memoryHook.clearAll}
            />

            <PDFChatPanel
                isOpen={showPDFPanel}
                onClose={() => setShowPDFPanel(false)}
                onSubmitWithContext={handlePDFSubmit}
            />
        </div>
    )
}
