/* eslint-disable react-refresh/only-export-components */
import { memo, useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { API_BASE } from '../../lib/api'
import { getToken } from '../../lib/auth'
import { fileContentPath } from '../../services/fileApi'
import { Spinner } from '../ui'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

/**
 * Streams a PDF from the API with HTTP Range requests (pdf.js fetches only the bytes it needs),
 * and renders pages lazily as they approach the viewport. No Blob/object URLs are created.
 */
export function usePdfDocument(fileId) {
  const [state, setState] = useState({ doc: null, error: null, loading: true })
  useEffect(() => {
    let task, cancelled = false
    setState({ doc: null, error: null, loading: true })
    ;(async () => {
      const token = await getToken()
      task = pdfjs.getDocument({
        url: `${API_BASE}${fileContentPath(fileId)}`,
        httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        rangeChunkSize: 65536 * 2,
        disableAutoFetch: true,
        isEvalSupported: false
      })
      try {
        const doc = await task.promise
        if (!cancelled) setState({ doc, error: null, loading: false })
      } catch (err) {
        if (cancelled) return
        const msg = err?.status === 404 || /404/.test(err?.message) ? 'This PDF could not be found. It may have been deleted.'
          : err?.name === 'PasswordException' ? 'This PDF is password-protected.'
            : 'The PDF could not be loaded. Check your connection and try again.'
        setState({ doc: null, error: msg, loading: false })
      }
    })()
    return () => { cancelled = true; task?.destroy() }
  }, [fileId])
  return state
}

const Page = memo(function Page({ doc, number, scale, baseSize, onVisible }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [near, setNear] = useState(number <= 2)
  const [size, setSize] = useState(baseSize)
  const [rendering, setRendering] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setNear(true)
    }, { rootMargin: '800px 0px' })
    const vis = new IntersectionObserver(([e]) => { if (e.intersectionRatio > 0.5) onVisible(number) }, { threshold: [0.5] })
    io.observe(el); vis.observe(el)
    return () => { io.disconnect(); vis.disconnect() }
  }, [number, onVisible])

  useEffect(() => {
    if (!near) return
    let renderTask, cancelled = false
    setRendering(true)
    doc.getPage(number).then(page => {
      if (cancelled) return
      const viewport = page.getViewport({ scale })
      setSize({ w: viewport.width, h: viewport.height })
      const canvas = canvasRef.current
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined })
      return renderTask.promise
    }).catch(err => {
      if (err?.name !== 'RenderingCancelledException') console.warn(`Page ${number} render failed:`, err?.message)
    }).finally(() => { if (!cancelled) setRendering(false) })
    return () => { cancelled = true; renderTask?.cancel() }
  }, [doc, number, scale, near])

  return (
    <div ref={wrapRef} data-page={number} className="relative mx-auto bg-white shadow-card rounded-sm" style={{ width: size.w, height: size.h }}>
      <canvas ref={canvasRef} className="block" aria-label={`Page ${number}`} />
      {rendering && <div className="absolute inset-0 flex items-center justify-center"><Spinner className="text-slate-400" /></div>}
    </div>
  )
})

export default function PdfCanvas({ doc, scale, onPageChange, containerRef }) {
  const [base, setBase] = useState(null)
  useEffect(() => {
    let alive = true
    doc.getPage(1).then(p => { if (alive) { const v = p.getViewport({ scale }); setBase({ w: v.width, h: v.height }) } })
    return () => { alive = false }
  }, [doc, scale])
  if (!base) return <div className="flex justify-center py-20"><Spinner /></div>
  return (
    <div className="flex flex-col gap-4 py-6 px-4 items-center min-w-fit" ref={containerRef}>
      {Array.from({ length: doc.numPages }, (_, i) => (
        <Page key={`${i + 1}-${scale}`} doc={doc} number={i + 1} scale={scale} baseSize={base} onVisible={onPageChange} />
      ))}
    </div>
  )
}
