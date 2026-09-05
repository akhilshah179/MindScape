import { useState, useRef } from 'react'
import { uploadFile } from '../services/fileApi'

export default function UploadButton({ subjectName, onUploadComplete, onError }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef(null)

  const handleClick = (e) => {
    e.stopPropagation()
    if (uploading) return
    setErrorMessage('')
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.click()
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMessage('')

    // 1. Validate PDF file type
    const isPdfType = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdfType) {
      const msg = 'Invalid file type. Please select a valid PDF file (.pdf).'
      setErrorMessage(msg)
      onError?.(msg)
      e.target.value = ''
      return
    }

    // 2. Validate file size (<= 25 MB)
    const MAX_BYTES = 25 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      const msg = `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`
      setErrorMessage(msg)
      onError?.(msg)
      e.target.value = ''
      return
    }

    try {
      setUploading(true)
      setProgress(0)

      const result = await uploadFile(file, subjectName, (pct) => {
        setProgress(pct)
      })

      if (onUploadComplete) {
        onUploadComplete(result.file)
      }
    } catch (err) {
      console.error('Upload failed:', err)
      const errorMsg = err.response?.data?.error || err.message || 'Failed to upload PDF. Please ensure backend is running.'
      setErrorMessage(errorMsg)
      onError?.(errorMsg)
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        title={errorMessage || (uploading ? `Uploading... ${progress}%` : `Upload PDF for ${subjectName}`)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
          transition-all border shrink-0
          ${uploading
            ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/40 cursor-not-allowed'
            : errorMessage
            ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100'
            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm hover:shadow'
          }`}
      >
        {uploading ? (
          <>
            <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>{progress}%</span>
          </>
        ) : (
          <>
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
            </svg>
            Upload PDF
          </>
        )}
      </button>
    </div>
  )
}

