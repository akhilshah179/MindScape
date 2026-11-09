// Coding Arena API. Identity comes from the auth token (userId args are ignored).
import { api } from '../../lib/api'

const get = (url, config) => api.get(`/coding${url}`, config).then(r => r.data)
const post = (url, body, config) => api.post(`/coding${url}`, body, config).then(r => r.data)

export const fetchProblems = (filters = {}) => get('/problems', { params: filters })
export const fetchProblem = (id) => get(`/problems/${encodeURIComponent(id)}`)

export const runCode = ({ code, language, problemId, stdin }) => post('/run', { code, language, problemId, stdin })
export const submitCode = ({ problemId, language, code, contestId }) => post('/submit', { problemId, language, code, contestId })

export const fetchSubmissions = (_userId, problemId) => get('/submissions', { params: problemId ? { problemId } : {} })

export const aiReviewCode = ({ code, language, problemTitle }) => post('/ai/review', { code, language, problemTitle })
export const aiGetHint = ({ problemId, hintLevel }) => post('/ai/hint', { problemId, hintLevel })
export const aiDebugCode = ({ code, language, error }) => post('/ai/debug', { code, language, error })
export const aiInterviewQuestions = ({ topic, count }) => post('/ai/interview', { topic, count })
export const aiMockInterview = ({ topic, messages }) => post('/ai/mock-interview', { topic, messages })

export const fetchDashboard = () => get('/dashboard')
export const fetchGamification = () => get('/gamification')

export const createContest = (data) => post('/contests', data)
export const fetchContests = () => get('/contests')
export const fetchContest = (id) => get(`/contests/${id}`)
export const joinContest = (id) => post(`/contests/${id}/join`, {})
export const fetchLeaderboard = (id) => get(`/contests/${id}/leaderboard`)

export default api
