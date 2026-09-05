import { useState, useRef, useEffect } from 'react'
import { getAllFiles, fetchFileBlob } from '../../services/fileApi'

export default function PDFChatPanel({ isOpen, onClose, onSubmitWithContext }) {
    const [tab, setTab] = useState('saved') // 'saved' | 'upload'
    const [savedFiles, setSavedFiles] = useState([])
    const [loadingSaved, setLoadingSaved] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [extractedText, setExtractedText] = useState('')
    const [extracting, setExtracting] = useState(false)
    const [prompt, setPrompt] = useState('')
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (isOpen) {
            loadSavedFiles()
        }
    }, [isOpen])

    const loadSavedFiles = async () => {
        setLoadingSaved(true)
        try {
            const files = await getAllFiles()
            setSavedFiles(files || [])
        } catch (err) {
            console.error('Failed to load saved files for PDF chat:', err)
        } finally {
            setLoadingSaved(false)
        }
    }

    if (!isOpen) return null

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file || file.type !== 'application/pdf') return
        setSelectedFile({ name: file.name, isUpload: true, fileObj: file })
        setExtracting(true)

        try {
            const { extractTextFromPDF } = await import('../../utils/pdfTextExtractor')
            const text = await extractTextFromPDF(file)
            setExtractedText(text)
        } catch (err) {
            console.error('PDF extraction failed:', err)
            alert('Could not extract text: ' + err.message)
            setExtractedText('')
        } finally {
            setExtracting(false)
        }
    }

    const handleSelectSaved = async (file) => {
        const fileName = file.originalName || file.name || 'document.pdf'
        setSelectedFile({ fileId: file.fileId, name: fileName, subjectName: file.subjectName })
        setExtracting(true)

        try {
            const blob = await fetchFileBlob(file.fileId)
            const { extractTextFromPDF } = await import('../../utils/pdfTextExtractor')
            const text = await extractTextFromPDF(new File([blob], fileName, { type: 'application/pdf' }))
            setExtractedText(text)
        } catch (err) {
            console.error('Failed to extract text from saved file:', err)
            alert('Could not extract text from document: ' + err.message)
            setExtractedText('')
        } finally {
            setExtracting(false)
        }
    }

    const handleSubmit = () => {
        if (!extractedText || !prompt.trim()) return
        onSubmitWithContext(
            prompt.trim(),
            extractedText,
            selectedFile?.fileId || null,
            selectedFile?.name || null
        )
        handleClose()
    }

    const handleClose = () => {
        setSelectedFile(null)
        setExtractedText('')
        setPrompt('')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 animate-fade-in" onClick={handleClose}>
            <div className="bg-[#0e0e15] border border-white/[0.08] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 flex items-center justify-center border border-violet-500/20">
                            <span className="text-base">📄</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white/90">Chat with PDF</h2>
                            <p className="text-[11px] text-white/40">Attach document context to your AI conversation</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/80 transition-colors flex items-center justify-center text-xs">✕</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    {!selectedFile ? (
                        <>
                            {/* Tabs */}
                            <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
                                <button
                                    onClick={() => setTab('saved')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                        tab === 'saved' ? 'bg-violet-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
                                    }`}
                                >
                                    Saved Library PDFs ({savedFiles.length})
                                </button>
                                <button
                                    onClick={() => setTab('upload')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                        tab === 'upload' ? 'bg-violet-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
                                    }`}
                                >
                                    Upload from Computer
                                </button>
                            </div>

                            {tab === 'saved' ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {loadingSaved ? (
                                        <div className="py-8 text-center text-white/40 text-xs flex items-center justify-center gap-2">
                                            <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                            Loading library documents...
                                        </div>
                                    ) : savedFiles.length === 0 ? (
                                        <div className="py-8 text-center text-white/30 text-xs italic bg-white/[0.02] rounded-2xl border border-white/[0.04]">
                                            No saved PDFs found. Use the Upload tab to add one.
                                        </div>
                                    ) : (
                                        savedFiles.map(file => (
                                            <button
                                                key={file.fileId}
                                                onClick={() => handleSelectSaved(file)}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-violet-500/10 border border-white/[0.06] hover:border-violet-500/30 text-left transition-all duration-150 group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-sm shrink-0">
                                                    📄
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-white/80 group-hover:text-white truncate">
                                                        {file.originalName || file.name}
                                                    </p>
                                                    <p className="text-[10px] text-white/30 mt-0.5">
                                                        {file.subjectName} • {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'PDF'}
                                                    </p>
                                                </div>
                                                <span className="text-[11px] text-violet-400 opacity-0 group-hover:opacity-100 font-medium transition-opacity">
                                                    Select →
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-10 border-2 border-dashed border-white/[0.08] hover:border-violet-500/40 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all bg-white/[0.02] hover:bg-violet-500/5 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 group-hover:scale-105 transition-transform flex items-center justify-center text-xl">
                                        📁
                                    </div>
                                    <p className="text-xs font-medium text-white/60 group-hover:text-white/90">Click to upload a PDF file</p>
                                    <p className="text-[10px] text-white/30">Supports .pdf documents</p>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {/* Selected Document Badge */}
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                                <span className="text-lg">📄</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/90 font-semibold truncate">{selectedFile.name}</p>
                                    <p className="text-[11px] text-violet-300/70 mt-0.5">
                                        {extracting
                                            ? 'Extracting readable text...'
                                            : `${(extractedText.length / 1000).toFixed(1)}k characters extracted and ready for AI`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setSelectedFile(null); setExtractedText('') }}
                                    className="w-6 h-6 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white text-xs flex items-center justify-center transition-colors"
                                    title="Choose another file"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Prompt input */}
                            {extractedText && (
                                <div className="space-y-3">
                                    <textarea
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                        placeholder="What would you like to ask about this document?"
                                        rows={3}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-violet-500/40 rounded-2xl px-4 py-3 text-xs text-white/80 placeholder-white/25 focus:outline-none resize-none transition-colors"
                                    />

                                    {/* Quick prompts */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            'Summarize key concepts',
                                            'What are the main takeaways?',
                                            'Explain formulas and methods',
                                            'Generate exam questions'
                                        ].map(q => (
                                            <button
                                                key={q}
                                                onClick={() => setPrompt(q)}
                                                className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-violet-500/10 hover:border-violet-500/30 text-[11px] text-white/50 hover:text-white/80 transition-colors"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={!prompt.trim() || extracting}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-violet-600/20 transition-all"
                                    >
                                        Start Conversation with PDF Context
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </div>
            </div>
        </div>
    )
}
