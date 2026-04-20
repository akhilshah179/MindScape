import * as pdfjsLib from 'pdfjs-dist'

// ✅ Worker setup (required)
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

// ─────────────────────────────────────────────
// 📄 Extract text from PDF
// ─────────────────────────────────────────────
export const extractTextFromPDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        const typedArray = new Uint8Array(reader.result)
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise

        let text = ''
        const maxPages = Math.min(pdf.numPages, 8) // limit pages for performance

        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map(item => item.str).join(' ') + '\n'
        }

        if (!text.trim()) {
          reject(new Error('No text found. PDF might be scanned/image-based.'))
          return
        }

        resolve(text.trim())
      } catch (err) {
        console.error('PDF extraction error:', err)
        reject(err)
      }
    }

    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─────────────────────────────────────────────
// 🔍 Search inside extracted text
// ─────────────────────────────────────────────
export function searchInText(text, query) {
  if (!text || !query) return false
  return text.toLowerCase().includes(query.toLowerCase())
}