import axios from 'axios'

const API_BASE = 'http://localhost:5000/api/coding'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
})

// ── Problems ──
export const fetchProblems = (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.difficulty) params.append('difficulty', filters.difficulty)
  if (filters.category) params.append('category', filters.category)
  if (filters.search) params.append('search', filters.search)
  return api.get(`/problems?${params.toString()}`).then(r => r.data)
}

export const fetchProblem = (id) =>
  api.get(`/problems/${id}`).then(r => r.data)

// ── Code Execution ──
export const runCode = ({ code, language, problemId, stdin }) =>
  api.post('/run', { code, language, problemId, stdin }).then(r => r.data)

export const submitCode = ({ userId, problemId, language, code }) =>
  api.post('/submit', { userId, problemId, language, code }).then(r => r.data)

// ── Submissions ──
export const fetchSubmissions = (userId, problemId) => {
  const params = problemId ? `?problemId=${problemId}` : ''
  return api.get(`/submissions/${userId}${params}`).then(r => r.data)
}

// ── AI Features ──
export const aiReviewCode = ({ code, language, problemTitle }) =>
  api.post('/ai/review', { code, language, problemTitle }).then(r => r.data)

export const aiGetHint = ({ problemId, hintLevel }) =>
  api.post('/ai/hint', { problemId, hintLevel }).then(r => r.data)

export const aiDebugCode = ({ code, language, error, userId }) =>
  api.post('/ai/debug', { code, language, error, userId }).then(r => r.data)

export const aiInterviewQuestions = ({ topic, count }) =>
  api.post('/ai/interview', { topic, count }).then(r => r.data)

export const aiMockInterview = ({ topic, messages }) =>
  api.post('/ai/mock-interview', { topic, messages }).then(r => r.data)

// ── Dashboard & Gamification ──
export const fetchDashboard = (userId) =>
  api.get(`/dashboard/${userId}`).then(r => r.data)

export const fetchGamification = (userId) =>
  api.get(`/gamification/${userId}`).then(r => r.data)

// ── Contests ──
export const createContest = (data) =>
  api.post('/contests', data).then(r => r.data)

export const fetchContests = () =>
  api.get('/contests').then(r => r.data)

export const fetchContest = (id) =>
  api.get(`/contests/${id}`).then(r => r.data)

export const joinContest = (id, data) =>
  api.post(`/contests/${id}/join`, data).then(r => r.data)

export const fetchLeaderboard = (id) =>
  api.get(`/contests/${id}/leaderboard`).then(r => r.data)

export default api
