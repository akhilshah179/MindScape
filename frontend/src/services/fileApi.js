// PDF library API. Text extraction, summaries and quizzes are done on the server,
// so the browser never downloads a whole PDF just to send its text back.
import { api, authFetch } from '../lib/api'

export async function uploadFile(file, subjectName = 'General', onProgress = null, signal) {
  const form = new FormData()
  form.append('subjectName', subjectName)
  form.append('file', file)
  const { data } = await api.post('/files/upload', form, {
    signal,
    timeout: 0,
    onUploadProgress: (e) => { if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)) }
  })
  return data
}

export async function getFiles(subjectName) {
  const { data } = await api.get('/files', { params: subjectName ? { subjectName } : {} })
  return data.files || []
}

export const getAllFiles = () => getFiles()

export async function deleteFile(fileId) {
  const { data } = await api.delete(`/files/${fileId}`)
  return data
}

/** Path for pdf.js range loading (use with authHeaders()). */
export const fileContentPath = (fileId) => `/files/${encodeURIComponent(fileId)}/content`

/** Trigger a browser download of the original PDF (one request, object URL revoked afterwards). */
export async function downloadFile(file) {
  const res = await authFetch(`${fileContentPath(file.fileId)}?download=1`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = file.originalName || file.name || 'document.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/** Full PDF as Blob (kept for compatibility; prefer range loading in the viewer). */
export async function fetchFileBlob(fileId) {
  const res = await authFetch(fileContentPath(fileId))
  return res.blob()
}

export async function getFileSummary(fileId) {
  const { data } = await api.get(`/files/${fileId}/summary`)
  return data.summary || null
}

// `text` is ignored: the server extracts text itself. Kept in the signature for callers.
export async function generateFileSummary(fileId, _text, forceRegenerate = false) {
  const { data } = await api.post(`/files/${fileId}/summary`, { forceRegenerate })
  return data
}

export async function getFileQuiz(fileId) {
  const { data } = await api.get(`/files/${fileId}/quiz`)
  return data.quiz || null
}

export async function generateFileQuiz(fileId, _text, forceRegenerate = false) {
  const { data } = await api.post(`/files/${fileId}/quiz`, { forceRegenerate })
  return data
}

/** Submit chosen option indexes; the server grades against its stored answer key. */
export async function saveFileQuizScore(fileId, payload) {
  const answers = (payload.answers || []).map(a => (typeof a === 'number' ? a : a?.selected ?? null))
  const { data } = await api.post(`/files/${fileId}/quiz/score`, { answers })
  return data
}

export async function getUserQuizScores() {
  const { data } = await api.get('/users/me/scores')
  return data || []
}
