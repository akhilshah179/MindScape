import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AISidebar({
    chats = [],
    groupedChats = {},
    activeChatId,
    searchQuery = '',
    isSearching = false,
    collapsed = false,
    onToggle,
    onCreateChat,
    onSelectChat,
    onRenameChat,
    onDeleteChat,
    onSearch,
    onClearSearch,
    onOpenPromptLibrary,
    onOpenMemory,
}) {
    const navigate = useNavigate()
    const [editingId, setEditingId] = useState(null)
    const [editTitle, setEditTitle] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const handleStartRename = (chat) => {
        setEditingId(chat.chatId)
        setEditTitle(chat.title || '')
    }

    const handleFinishRename = (chatId) => {
        if (editTitle.trim()) {
            onRenameChat(chatId, editTitle.trim())
        }
        setEditingId(null)
        setEditTitle('')
    }

    const handleDelete = (chatId) => {
        onDeleteChat(chatId)
        setDeleteConfirm(null)
    }

    if (collapsed) {
        return (
            <div className="w-16 bg-[#08080d] border-r border-white/[0.06] flex flex-col h-screen">
                <div className="p-3 flex flex-col items-center gap-2">
                    <button onClick={onToggle} className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors text-sm">
                        ☰
                    </button>
                    <button onClick={onCreateChat} className="w-10 h-10 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 flex items-center justify-center text-violet-400 transition-colors text-lg">
                        +
                    </button>
                </div>
                <div className="flex-1" />
                <div className="p-3 flex flex-col items-center gap-2 border-t border-white/[0.06]">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/30 hover:text-white/50 transition-colors text-sm">
                        ←
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-72 bg-[#08080d] border-r border-white/[0.06] flex flex-col h-screen sidebar-animate">
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-violet-500/20">
                            ✦
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white/90">StudyMate AI</p>
                            <p className="text-[9px] text-white/25">Intelligent Study Assistant</p>
                        </div>
                    </div>
                    {onToggle && (
                        <button onClick={onToggle} className="text-white/30 hover:text-white/60 text-sm transition-colors">
                            ◁
                        </button>
                    )}
                </div>

                {/* New chat + search */}
                <button
                    onClick={onCreateChat}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/20 text-violet-300 text-xs font-medium transition-all mb-2"
                >
                    <span className="text-sm">+</span>
                    New Chat
                </button>

                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => onSearch(e.target.value)}
                        placeholder="Search chats..."
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-violet-500/30 transition-colors"
                    />
                    {isSearching && (
                        <button onClick={onClearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {Object.entries(groupedChats).map(([group, groupChats]) => (
                    <div key={group} className="mb-3">
                        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold px-2 py-1">{group}</p>
                        {groupChats.map(chat => (
                            <div
                                key={chat.chatId}
                                className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-150 mb-0.5
                                    ${activeChatId === chat.chatId
                                        ? 'bg-violet-500/10 border border-violet-500/15'
                                        : 'hover:bg-white/[0.03] border border-transparent'}`}
                                onClick={() => onSelectChat(chat.chatId)}
                            >
                                <div className="flex-1 min-w-0">
                                    {editingId === chat.chatId ? (
                                        <input
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            onBlur={() => handleFinishRename(chat.chatId)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleFinishRename(chat.chatId); if (e.key === 'Escape') setEditingId(null) }}
                                            autoFocus
                                            className="w-full bg-white/10 rounded px-1.5 py-0.5 text-xs text-white/80 focus:outline-none"
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <p className={`text-xs font-medium truncate ${activeChatId === chat.chatId ? 'text-violet-300' : 'text-white/50'}`}>
                                            {chat.title || 'New Chat'}
                                        </p>
                                    )}
                                    <p className="text-[9px] text-white/15 mt-0.5">
                                        {chat.messageCount || 0} messages
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={e => { e.stopPropagation(); handleStartRename(chat) }}
                                        className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 text-[10px] transition-colors"
                                        title="Rename"
                                    >✎</button>
                                    {deleteConfirm === chat.chatId ? (
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(chat.chatId) }}
                                            className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 text-[10px] transition-colors"
                                            title="Confirm delete"
                                        >✓</button>
                                    ) : (
                                        <button
                                            onClick={e => { e.stopPropagation(); setDeleteConfirm(chat.chatId) }}
                                            className="w-6 h-6 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-white/20 hover:text-red-400 text-[10px] transition-colors"
                                            title="Delete"
                                        >🗑</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}

                {Object.keys(groupedChats).length === 0 && (
                    <div className="text-center py-8 text-white/15 text-xs">
                        {isSearching ? 'No matching chats' : 'No chats yet'}
                    </div>
                )}
            </div>

            {/* Bottom actions */}
            <div className="p-3 border-t border-white/[0.06] space-y-1">
                <button
                    onClick={onOpenPromptLibrary}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.03] text-xs font-medium transition-colors"
                >
                    <span>📖</span> Prompt Library
                </button>
                <button
                    onClick={onOpenMemory}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.03] text-xs font-medium transition-colors"
                >
                    <span>🧠</span> AI Memory
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/[0.03] text-xs transition-colors"
                >
                    <span>←</span> Back to Dashboard
                </button>
            </div>
        </div>
    )
}
