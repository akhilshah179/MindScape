import { useState, useRef } from 'react'
import { uploadData } from 'aws-amplify/storage'
import { getCurrentUser } from 'aws-amplify/auth'

export default function UploadButton({ subjectName, onUploadComplete }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef()

  const handleClick = () => inputRef.current.click()

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      // No alert — silently ignore non-PDFs (user already sees accept="application/pdf")
      return
    }
    try {
      setUploading(true)
      const user = await getCurrentUser()
      const path = `private/${user.userId}/${subjectName}/${file.name}`
      await uploadData({
        path,
        data: file,
        options: {
          contentType: 'application/pdf',
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) setProgress(Math.round((transferredBytes / totalBytes) * 100))
          },
        },
      }).result
      onUploadComplete?.()
      e.target.value = ''
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
          transition-all border shrink-0
          ${uploading
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow'
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
    </>
  )
}
