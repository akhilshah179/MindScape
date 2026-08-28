import { useState, useRef } from 'react'

export default function PDFChatPanel({ isOpen, onClose, onSubmitWithContext }) {
    const [file, setFile] = useState(null)
    const [extractedText, setExtractedText] = useState('')
    const [extracting, setExtracting] = useState(false)
    const [prompt, setPrompt] = useState('')
    const fileInputRef = useRef(null)

    if (!isOpen) return null

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile || selectedFile.type !== 'application/pdf') return
        setFile(selectedFile)
        setExtracting(true)

        try {
            // Dynamic import to avoid loading pdf.js unless needed
            const { extractTextFromPDF } = await import('../../utils/pdfTextExtractor')
            const text = await extractTextFromPDF(selectedFile)
            setExtractedText(text)
        } catch (err) {
            console.error('PDF extraction failed:', err)
            setExtractedText('')
        } finally {
            setExtracting(false)
        }
    }

    const handleSubmit = () => {
        if (!extractedText || !prompt.trim()) return
        onSubmitWithContext(prompt.trim(), extractedText)
        // Reset
        setFile(null)
        setExtractedText('')
        setPrompt('')
        onClose()
    }

    const handleClose = () => {
        setFile(null)
        setExtractedText('')
        setPrompt('')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={handleClose}>
            <div className="bg-[#0e0e15] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 flex items-center justify-center">
                            <span className="text-sm">📄</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white/90">Chat with PDF</h2>
                            <p className="text-[10px] text-white/30">Upload a PDF and ask questions about it</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-white/30 hover:text-white/60 transition-colors text-sm">✕</button>
                </div>

                {/* Content */}
                <div className="px-5 py-4 space-y-4">
                    {/* File upload area */}
                    {!file ? (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-8 border-2 border-dashed border-white/[0.08] hover:border-violet-500/30 rounded-xl flex flex-col items-center gap-2 transition-colors group"
                        >
                            <span className="text-2xl">📁</span>
                            <p className="text-xs text-white/40 group-hover:text-white/60">Click to upload a PDF</p>
                            <p className="text-[10px] text-white/20">Supports .pdf files</p>
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                            <span className="text-sm">📄</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/70 font-medium truncate">{file.name}</p>
                                <p className="text-[10px] text-white/30">
                                    {extracting ? 'Extracting text...' : `${(extractedText.length / 1000).toFixed(1)}k characters extracted`}
                                </p>
                            </div>
                            <button
                                onClick={() => { setFile(null); setExtractedText('') }}
                                className="text-white/30 hover:text-white/60 text-xs"
                            >✕</button>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {/* Prompt input */}
                    {extractedText && (
                        <>
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder="What would you like to know about this document?"
                                rows={3}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-violet-500/30 resize-none transition-colors"
                            />

                            {/* Quick prompts */}
                            <div className="flex flex-wrap gap-1.5">
                                {['Summarize this document', 'What are the key points?', 'Generate a quiz from this'].map(q => (
                                    <button
                                        key={q}
                                        onClick={() => setPrompt(q)}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-violet-500/10 hover:border-violet-500/20 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!prompt.trim() || extracting}
                                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-xs font-semibold transition-colors"
                            >
                                Send with PDF Context
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
