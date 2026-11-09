import { useState } from 'react'
import { Modal, Segmented } from '../ui'
import { PROMPT_CATEGORIES, PROMPT_TEMPLATES } from '../../utils/promptTemplates'

export default function PromptLibrary({ isOpen, onClose, onSelectPrompt }) {
  const [cat, setCat] = useState(PROMPT_CATEGORIES[0].id)
  return (
    <Modal open={isOpen} onClose={onClose} title="Prompt library" description="Start from a proven study prompt. Replace the [brackets]." size="lg">
      <div className="p-6">
        <div className="overflow-x-auto thin-scroll pb-2 -mx-1 px-1">
          <Segmented layoutId="prompt-cat" value={cat} onChange={setCat} options={PROMPT_CATEGORIES.map(c => ({ value: c.id, label: c.label }))} />
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
          {PROMPT_TEMPLATES.filter(t => t.category === cat).map(t => (
            <button key={t.id} onClick={() => { onSelectPrompt(t.template); onClose() }}
              className="text-left p-4 rounded-xl border hover:border-accent/40 hover:bg-accent/5 transition-colors">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              <p className="text-xs text-ink-3 mt-1">{t.description}</p>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
