import { useState } from 'react'
import { PROMPT_CATEGORIES, PROMPT_TEMPLATES } from '../../utils/promptTemplates'

const CATEGORY_COLORS = {
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', activeBg: 'bg-violet-500/20' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', activeBg: 'bg-emerald-500/20' },
    sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', activeBg: 'bg-sky-500/20' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', activeBg: 'bg-amber-500/20' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', activeBg: 'bg-rose-500/20' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', activeBg: 'bg-indigo-500/20' },
}

export default function PromptLibrary({ isOpen, onClose, onSelectPrompt }) {
    const [activeCategory, setActiveCategory] = useState('learning')

    if (!isOpen) return null

    const filtered = PROMPT_TEMPLATES.filter(t => t.category === activeCategory)

    const handleSelect = (template) => {
        onSelectPrompt(template.template)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
            <div className="bg-[#0e0e15] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 flex items-center justify-center">
                            <span className="text-sm">📖</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white/90">Prompt Library</h2>
                            <p className="text-[10px] text-white/30">Quick-start templates for common tasks</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-sm">✕</button>
                </div>

                {/* Category tabs */}
                <div className="px-5 py-3 border-b border-white/[0.06]">
                    <div className="flex flex-wrap gap-1.5">
                        {PROMPT_CATEGORIES.map(cat => {
                            const colors = CATEGORY_COLORS[cat.color] || CATEGORY_COLORS.violet
                            const isActive = activeCategory === cat.id
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border
                                        ${isActive
                                            ? `${colors.activeBg} ${colors.border} ${colors.text}`
                                            : `bg-white/[0.03] border-white/[0.05] text-white/40 hover:text-white/60 hover:bg-white/[0.05]`
                                        }`}
                                >
                                    <span>{cat.icon}</span>
                                    {cat.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Templates */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-3">
                    <div className="space-y-2">
                        {filtered.map(template => (
                            <button
                                key={template.id}
                                onClick={() => handleSelect(template)}
                                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-violet-500/5 hover:border-violet-500/15 transition-all group"
                            >
                                <p className="text-xs font-semibold text-white/70 group-hover:text-white/90 mb-0.5">{template.title}</p>
                                <p className="text-[10px] text-white/30 group-hover:text-white/45 mb-2">{template.description}</p>
                                <p className="text-[10px] text-white/15 group-hover:text-white/25 line-clamp-2 italic">{template.template}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
