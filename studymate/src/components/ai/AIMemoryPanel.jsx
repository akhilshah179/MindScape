import { useState } from 'react'

export default function AIMemoryPanel({ isOpen, onClose, memories = [], onSetItem, onDeleteItem, onClearAll }) {
    const [newKey, setNewKey] = useState('')
    const [newValue, setNewValue] = useState('')
    const [showClearConfirm, setShowClearConfirm] = useState(false)

    if (!isOpen) return null

    const handleAdd = () => {
        if (!newKey.trim() || !newValue.trim()) return
        onSetItem(newKey.trim(), newValue.trim())
        setNewKey('')
        setNewValue('')
    }

    const handleClear = () => {
        onClearAll()
        setShowClearConfirm(false)
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
            <div className="bg-[#0e0e15] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 flex items-center justify-center">
                            <span className="text-sm">🧠</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white/90">AI Memory</h2>
                            <p className="text-[10px] text-white/30">{memories.length} items stored</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-sm">✕</button>
                </div>

                {/* Add new */}
                <div className="px-5 py-3 border-b border-white/[0.06]">
                    <div className="flex gap-2">
                        <input
                            value={newKey}
                            onChange={e => setNewKey(e.target.value)}
                            placeholder="Key (e.g. learning_goal)"
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-violet-500/30"
                        />
                        <input
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            placeholder="Value"
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-violet-500/30"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newKey.trim() || !newValue.trim()}
                            className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-xs font-semibold transition-colors"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Memory list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-3">
                    {memories.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-white/20 text-sm mb-1">No memories yet</p>
                            <p className="text-white/10 text-xs">AI will automatically learn from your conversations, or add items manually above.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {memories.map(mem => (
                                <div
                                    key={mem.memoryKey}
                                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-violet-400/60 font-medium uppercase tracking-wider">{mem.memoryKey}</p>
                                        <p className="text-xs text-white/60 mt-0.5 break-words">{mem.value}</p>
                                        <p className="text-[9px] text-white/15 mt-1">
                                            {mem.source === 'auto' ? '🤖 Auto-detected' : '✏️ Manual'} · {new Date(mem.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onDeleteItem(mem.memoryKey)}
                                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 text-xs transition-all shrink-0 mt-1"
                                        title="Delete"
                                    >
                                        🗑
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {memories.length > 0 && (
                    <div className="px-5 py-3 border-t border-white/[0.06]">
                        {showClearConfirm ? (
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-red-400/80 flex-1">Clear all memory items?</p>
                                <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-white/50 text-xs font-medium">Cancel</button>
                                <button onClick={handleClear} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30">Clear All</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="text-xs text-white/20 hover:text-red-400/60 transition-colors"
                            >
                                Clear all memory
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
