import * as pdfjsLib from 'pdfjs-dist'

// Worker setup
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

const MAX_PAGES_TO_EXTRACT = 40 // Safe upper bound for memory and performance

/**
 * Clean and normalize extracted text
 */
function cleanExtractedText(rawText) {
  if (!rawText) return ''
  return rawText
    .replace(/\0/g, '') // remove null bytes
    .replace(/[\r\t]+/g, ' ') // normalize whitespace
    .replace(/[ ]{2,}/g, ' ') // collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n') // collapse multiple blank lines
    .trim()
}

/**
 * Check if the text has sufficient meaningful readable content
 */
function isMeaningfulText(text) {
  if (!text) return false
  const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length
  return alphanumericCount >= 30
}

/**
 * Extract clean, structured text from a PDF file
 * @param {File|Blob} file 
 * @returns {Promise<string>}
 */
export const extractTextFromPDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        const typedArray = new Uint8Array(reader.result)
        const pdf = await pdfjsLib.getDocument({
          data: typedArray,
          useSystemFonts: true,
          disableFontFace: false
        }).promise

        let combinedText = ''
        const totalPages = pdf.numPages
        const pagesToRead = Math.min(totalPages, MAX_PAGES_TO_EXTRACT)

        for (let i = 1; i <= pagesToRead; i++) {
          try {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent({
              normalizeWhitespace: true,
              disableCombineTextItems: false
            })

            let pageText = ''
            let lastY = null

            for (const item of textContent.items) {
              if (!item.str) continue
              // If new line detected by vertical transform shift
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 8) {
                pageText += '\n'
              } else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                pageText += ' '
              }
              pageText += item.str
              lastY = item.transform[5]
            }

            if (pageText.trim()) {
              combinedText += `\n--- Page ${i} ---\n` + pageText.trim() + '\n'
            }
          } catch (pageErr) {
            console.warn(`[pdfTextExtractor] Warning extracting page ${i}:`, pageErr.message)
          }
        }

        const cleaned = cleanExtractedText(combinedText)

        if (!isMeaningfulText(cleaned)) {
          reject(new Error('This PDF does not contain extractable text. Scanned or image-based PDFs require OCR.'))
          return
        }

        resolve(cleaned)
      } catch (err) {
        console.error('PDF extraction error:', err)
        reject(err)
      }
    }

    reader.onerror = (err) => reject(new Error('Failed to read PDF binary data: ' + err))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Search inside extracted text
 */
export function searchInText(text, query) {
  if (!text || !query) return false
  return text.toLowerCase().includes(query.toLowerCase())
}