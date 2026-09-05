import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'aws-amplify/auth'
import { getAllFiles } from '../services/fileApi'
import { getAuthUser, clearLocalUser } from '../utils/auth'
import UploadButton from '../components/UploadButton'
import FileList from '../components/FileList'

import AnalyticsDashboard from '../components/AnalyticsDashboard'
import { useStreak, useSessionTimer, getRevisionPlan, useQuizScores } from '../hooks/useStudyTracker'
import { useRecommendations } from '../hooks/useRecommendations'
import ProductivityDashboard from '../components/ProductivityDashboard'
import { useCloudSync } from '../hooks/useCloudSync'
import MeetingModal from '../components/meeting/MeetingModal'
import ThemeToggle from '../components/ThemeToggle'

const DEFAULT_SUBJECTS = [
  { name: 'Artificial Intelligence', abbr: 'AI', color: 'subject-violet' },
  { name: 'Machine Learning', abbr: 'ML', color: 'subject-rose' },
  { name: 'Cloud Computing', abbr: 'CC', color: 'subject-sky' },
]
const SUBJECT_COLORS = ['subject-emerald', 'subject-amber', 'subject-coral', 'subject-indigo', 'subject-teal']

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])
  return { toasts, addToast, removeToast }
}

function Toast({ toasts, removeToast }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm
          pointer-events-auto min-w-[220px] max-w-xs border backdrop-blur-sm
          ${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''}
          ${t.type === 'error' ? 'bg-red-50    border-red-200    text-red-800' : ''}
          ${t.type === 'info' ? 'bg-violet-50 border-violet-200 text-violet-800' : ''}`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'i'}</span>
          <span className="flex-1 font-medium">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-40 hover:opacity-80 transition-opacity">✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── Add Subject Modal ────────────────────────────────────────────────────────
function AddSubjectModal({ existingNames, onAdd, onClose }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Please enter a subject name.'); return }
    if (existingNames.includes(trimmed.toLowerCase())) { setError('Subject already exists.'); return }
    const color = SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]
    onAdd({ name: trimmed, abbr: trimmed.slice(0, 2).toUpperCase(), color })
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-7">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-slate-800 font-semibold text-lg">New Subject</h2>
            <p className="text-slate-400 text-sm mt-0.5">Add a study topic to your dashboard</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
            text-slate-500 flex items-center justify-center transition-colors text-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Data Structures" autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800
                placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2
                focus:ring-violet-100 text-sm transition-all"/>
            {error && <p className="text-red-500 text-xs mt-1.5 ml-1">{error}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-2xl transition-colors text-sm">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm shadow-sm">
              Add Subject
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-7">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4 text-xl">🗑️</div>
        <h2 className="text-slate-800 font-semibold text-lg mb-1">Remove Subject?</h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-2xl transition-colors text-sm">Cancel</button>
          <button onClick={() => { onConfirm(); onClose() }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-2xl transition-colors text-sm">Remove</button>
        </div>
      </div>
    </div>
  )
}

// ─── Subject styles ───────────────────────────────────────────────────────────
const subjectStyles = {
  'subject-violet': { card: 'bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20', badge: 'bg-violet-600 dark:bg-violet-500/80', text: 'text-violet-700 dark:text-violet-300' },
  'subject-rose': { card: 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20', badge: 'bg-rose-500 dark:bg-rose-500/80', text: 'text-rose-700 dark:text-rose-300' },
  'subject-sky': { card: 'bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20', badge: 'bg-sky-600 dark:bg-sky-500/80', text: 'text-sky-700 dark:text-sky-300' },
  'subject-emerald': { card: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20', badge: 'bg-emerald-600 dark:bg-emerald-500/80', text: 'text-emerald-700 dark:text-emerald-300' },
  'subject-amber': { card: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20', badge: 'bg-amber-500 dark:bg-amber-500/80', text: 'text-amber-700 dark:text-amber-300' },
  'subject-coral': { card: 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20', badge: 'bg-orange-500 dark:bg-orange-500/80', text: 'text-orange-700 dark:text-orange-300' },
  'subject-indigo': { card: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20', badge: 'bg-indigo-600 dark:bg-indigo-500/80', text: 'text-indigo-700 dark:text-indigo-300' },
  'subject-teal': { card: 'bg-teal-50 dark:bg-teal-500/10 border-teal-100 dark:border-teal-500/20', badge: 'bg-teal-600 dark:bg-teal-500/80', text: 'text-teal-700 dark:text-teal-300' },
}
const getStyle = (color) => subjectStyles[color] || subjectStyles['subject-violet']

// ─── Subject Card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, pdfCount, refreshTrigger, onUploadComplete, onError, onDelete, isCustom }) {
  const [expanded, setExpanded] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const style = getStyle(subject.color)
  return (
    <>
      {showConfirm && (
        <ConfirmModal
          message={`"${subject.name}" will be removed from your dashboard.`}
          onConfirm={onDelete} onClose={() => setShowConfirm(false)} />
      )}
      <div className={`${style.card} border rounded-3xl p-5 flex flex-col gap-4 relative group transition-shadow hover:shadow-md`}>
        <div className="flex items-start justify-between gap-2">
          <div className={`${style.badge} w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0`}>
            {subject.abbr}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isCustom && (
              <button
                onClick={() => setShowConfirm(true)}
                title="Delete subject"
                className="opacity-70 group-hover:opacity-100 transition-opacity
                  w-7 h-7 rounded-full bg-white dark:bg-white/10 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400
                  flex items-center justify-center text-xs border border-slate-200 dark:border-white/10"
              >
                ✕
              </button>
            )}
            <UploadButton subjectName={subject.name} onUploadComplete={onUploadComplete} onError={onError} />
          </div>
        </div>
        <div>
          <h3 className="text-slate-800 dark:text-white/90 font-semibold text-sm leading-tight">{subject.name}</h3>
          <p className={`${style.text} text-xs mt-1 font-medium`}>{pdfCount} PDF{pdfCount !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          className={`${style.text} text-xs font-medium flex items-center gap-1 hover:opacity-70 transition-opacity w-fit`}>
          {expanded ? '▲ Hide files' : '▼ Show files'}
        </button>
        {expanded && <FileList subjectName={subject.name} refreshTrigger={refreshTrigger} />}
      </div>
    </>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon }) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-slate-400 dark:text-white/50 text-xs font-medium uppercase tracking-wide">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-slate-800 dark:text-white/90 text-3xl font-bold">{value}</p>
      <p className="text-slate-400 dark:text-white/50 text-xs mt-1">{sub}</p>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [customSubjects, setCustomSubjects] = useState(null)
  const [pdfCounts, setPdfCounts] = useState({})
  const [refreshMap, setRefreshMap] = useState({})
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { toasts, addToast, removeToast } = useToast()
  const { tickStreak } = useStreak()
  const { weakTopics } = useQuizScores()
  const revisionPlan = getRevisionPlan(weakTopics || [])
  const { recommendations } = useRecommendations()
  
  // Cloud sync
  const { hasLoaded: cloudLoaded } = useCloudSync(user?.userId)

  // Track session time for the whole app session
  useSessionTimer('General')

  const allSubjects = [...DEFAULT_SUBJECTS, ...(customSubjects || [])]

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const u = await getAuthUser()
        setUser({
          userId: u.userId,
          name: u.name,
          email: u.email,
          initial: (u.name || u.email || 'U')[0].toUpperCase(),
        })
        tickStreak()   // tick streak on every login
      } catch { navigate('/login') }
      finally { setLoadingUser(false) }
    }
    fetchUser()
  }, [navigate])

  useEffect(() => {
    if (user) {
      loadSubjects(user.userId)
    }
  }, [user])

  useEffect(() => {
    if (user && customSubjects !== null) {
      loadAllCounts(user.userId, customSubjects)
    }
  }, [customSubjects, user])

  useEffect(() => {
    if (user && customSubjects !== null) {
      saveSubjects(user.userId, customSubjects)
    }
  }, [customSubjects, user])

  const saveSubjects = (userId, subjects) => {
    try {
      localStorage.setItem(`studymate_subjects_${userId}`, JSON.stringify(subjects))
    } catch (err) {
      console.error('Failed to save subjects:', err)
    }
  }

  const loadSubjects = (userId) => {
    try {
      const stored = localStorage.getItem(`studymate_subjects_${userId}`)
      if (stored) {
        setCustomSubjects(JSON.parse(stored))
      } else {
        setCustomSubjects([])
      }
    } catch {
      setCustomSubjects([])
    }
  }

  const loadAllCounts = async (userId, currentCustom) => {
    try {
      const allFiles = await getAllFiles()
      const counts = {}
      const subjectsList = [...DEFAULT_SUBJECTS, ...(currentCustom || [])]
      subjectsList.forEach(s => { counts[s.name] = 0 })
      allFiles.forEach(f => {
        const subj = f.subjectName || 'General'
        counts[subj] = (counts[subj] || 0) + 1
      })
      setPdfCounts(counts)
    } catch (err) {
      console.error('Failed to load file counts:', err)
    }
  }

  const handleLogout = async () => {
    try { await signOut() } catch {}
    clearLocalUser()
    navigate('/login')
  }
  const handleAddSubject = (s) => { setCustomSubjects(prev => [...(prev || []), s]); setPdfCounts(prev => ({ ...prev, [s.name]: 0 })); addToast(`"${s.name}" added!`, 'success') }
  const handleDeleteSubject = (name) => { setCustomSubjects(prev => (prev || []).filter(s => s.name !== name)); setPdfCounts(prev => { const n = { ...prev }; delete n[name]; return n }); addToast(`"${name}" removed.`, 'info') }
  const handleUploadComplete = (subjectName) => {
    setRefreshMap(prev => ({ ...prev, [subjectName]: (prev[subjectName] || 0) + 1 }))
    loadAllCounts(user?.userId, customSubjects)
    addToast('PDF uploaded successfully!', 'success')
  }

  const totalPdfs = Object.values(pdfCounts).reduce((a, b) => a + b, 0)
  const tabs = ['Dashboard', 'Subjects', 'Productivity', 'Analytics', 'Profile']

  if (loadingUser || customSubjects === null || !cloudLoaded) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">{!cloudLoaded ? 'Syncing from cloud...' : 'Loading your dashboard...'}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#06060a] text-slate-800 dark:text-slate-200 transition-colors duration-500">
      <Toast toasts={toasts} removeToast={removeToast} />
      {showAddModal && (
        <AddSubjectModal existingNames={allSubjects.map(s => s.name.toLowerCase())}
          onAdd={handleAddSubject} onClose={() => setShowAddModal(false)} />
      )}
      {showMeetingModal && <MeetingModal onClose={() => setShowMeetingModal(false)} />}

      {/* ── Navbar ── */}
      <nav className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border-b border-slate-100 dark:border-white/10 px-4 sm:px-8 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-slate-800 dark:text-white font-semibold text-base">StudyMate</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-2xl px-1.5 py-1.5">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all
                  ${activeTab === tab ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {tab}{tab === 'Analytics' ? ' 📊' : ''}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setShowMeetingModal(true)}
              className="hidden sm:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700
                text-white px-3.5 py-2 rounded-2xl text-sm font-medium transition-colors shadow-sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              Meet
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="hidden sm:flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700
                text-white px-3.5 py-2 rounded-2xl text-sm font-medium transition-colors shadow-sm">
              + Add Subject
            </button>
            <div className="hidden sm:flex items-center gap-2.5">
              <ThemeToggle className="p-2 rounded-full transition-all duration-300 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 shadow-sm hover:scale-110 active:scale-95" />
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm shrink-0">
                {user.initial}
              </div>
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.name}</p>
                <p className="text-xs text-slate-400 truncate max-w-[130px]">{user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="hidden sm:block px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/20
                text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium transition-colors">Sign out</button>
            <button onClick={() => setMobileMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-base leading-none">
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden max-w-5xl mx-auto mt-3 pb-2 border-t border-slate-100 pt-3 space-y-1">
            {tabs.map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setMobileMenuOpen(false) }}
                className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${activeTab === tab ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab}{tab === 'Analytics' ? ' 📊' : ''}
              </button>
            ))}
            <button onClick={() => { setShowAddModal(true); setMobileMenuOpen(false) }}
              className="block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-violet-600 hover:bg-violet-50">+ Add Subject</button>
            <button onClick={handleLogout}
              className="block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50">Sign out</button>
          </div>
        )}
      </nav>

      {/* ── Content ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ══ Dashboard ══ */}
        {activeTab === 'Dashboard' && (
          <>
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Good day, {user.name} 👋</h1>
              <p className="text-slate-500 dark:text-white/60 mt-1 text-sm">
                {totalPdfs > 0
                  ? `You have ${totalPdfs} study material${totalPdfs !== 1 ? 's' : ''} ready to explore.`
                  : 'Start by uploading a PDF to any subject below.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
              <StatCard label="Subjects" value={allSubjects.length} sub="Available" icon="📚" />
              <StatCard label="Materials" value={totalPdfs} sub="PDF files" icon="📄" />
              <div className="col-span-2 sm:col-span-1">
                <StatCard label="Account" value="Active" sub="Verified" icon="✅" />
              </div>
            </div>

            {/* StudyMate AI Banner */}
            <button
              onClick={() => navigate('/ai')}
              className="w-full mb-4 group relative overflow-hidden bg-gradient-to-r from-violet-600/10 via-fuchsia-600/10 to-violet-600/5
                dark:from-violet-500/10 dark:via-fuchsia-500/10 dark:to-violet-500/5
                border border-violet-200 dark:border-violet-500/20 rounded-3xl p-5 sm:p-6
                hover:border-violet-300 dark:hover:border-violet-500/40 transition-all duration-500
                hover:shadow-xl hover:shadow-violet-500/10 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow shrink-0">
                    ✦
                  </div>
                  <div>
                    <h3 className="text-slate-800 dark:text-white font-bold text-base sm:text-lg">StudyMate AI</h3>
                    <p className="text-slate-500 dark:text-white/50 text-xs sm:text-sm mt-0.5">Chat • PDF Analysis • Quiz Generation • Study Assistant</p>
                  </div>
                </div>
                <span className="text-slate-400 dark:text-white/30 group-hover:translate-x-1 transition-transform text-lg">→</span>
              </div>
            </button>

            {/* Coding Arena Banner */}
            <button
              onClick={() => navigate('/coding')}
              className="w-full mb-8 group relative overflow-hidden bg-gradient-to-r from-indigo-600/10 via-violet-600/10 to-indigo-600/5
                dark:from-indigo-500/10 dark:via-violet-500/10 dark:to-indigo-500/5
                border border-indigo-200 dark:border-indigo-500/20 rounded-3xl p-5 sm:p-6
                hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all duration-500
                hover:shadow-xl hover:shadow-indigo-500/10 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow shrink-0">
                    {'</>'}
                  </div>
                  <div>
                    <h3 className="text-slate-800 dark:text-white font-bold text-base sm:text-lg">Coding Arena</h3>
                    <p className="text-slate-500 dark:text-white/50 text-xs sm:text-sm mt-0.5">Practice DSA • AI Code Review • Compete in Contests</p>
                  </div>
                </div>
                <span className="text-slate-400 dark:text-white/30 group-hover:translate-x-1 transition-transform text-lg">→</span>
              </div>
            </button>



            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-700 dark:text-white/80 text-base font-semibold">Your Subjects</h2>
              <button onClick={() => setShowAddModal(true)}
                className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 text-sm font-medium transition-colors">+ Add new</button>
            </div>

            {allSubjects.length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-white/40">
                <p className="text-3xl mb-3">📂</p>
                <p className="text-sm">No subjects yet. Add one to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allSubjects.map(subject => (
                  <SubjectCard key={subject.name} subject={subject}
                    pdfCount={pdfCounts[subject.name] || 0}
                    refreshTrigger={refreshMap[subject.name] || 0}
                    onUploadComplete={() => handleUploadComplete(subject.name)}
                    onError={(msg) => addToast(msg, 'error')}
                    onDelete={() => handleDeleteSubject(subject.name)}
                    isCustom={!DEFAULT_SUBJECTS.some(d => d.name === subject.name)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ Subjects ══ */}
        {activeTab === 'Subjects' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-slate-800 dark:text-white text-xl font-bold">All Subjects</h2>
              <button onClick={() => setShowAddModal(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-2xl transition-colors shadow-sm">
                + Add Subject
              </button>
            </div>
            <div className="space-y-4">
              {allSubjects.map(subject => {
                const style = getStyle(subject.color)
                return (
                  <div key={subject.name} className={`${style.card} border rounded-3xl p-5 sm:p-6`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`${style.badge} w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0`}>
                          {subject.abbr}
                        </div>
                        <div>
                          <h3 className="text-slate-800 dark:text-white/90 font-semibold">{subject.name}</h3>
                          <p className={`${style.text} text-xs font-medium mt-0.5`}>
                            {pdfCounts[subject.name] || 0} PDF{(pdfCounts[subject.name] || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <UploadButton subjectName={subject.name} onUploadComplete={() => handleUploadComplete(subject.name)} onError={(msg) => addToast(msg, 'error')} />
                        {!DEFAULT_SUBJECTS.some(d => d.name === subject.name) && (
                          <button onClick={() => handleDeleteSubject(subject.name)}
                            className="text-slate-400 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400 text-xs px-3 py-1.5 rounded-xl
                              bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors border border-slate-200 dark:border-white/10 font-medium">Remove</button>
                        )}
                      </div>
                    </div>
                    <FileList subjectName={subject.name} refreshTrigger={refreshMap[subject.name] || 0} />
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ══ Productivity ══ */}
        {activeTab === 'Productivity' && (
          <ProductivityDashboard />
        )}

        {/* ══ Analytics ══ */}
        {activeTab === 'Analytics' && (
          <>
            <div className="mb-6">
              <h2 className="text-slate-800 dark:text-white text-xl font-bold">Analytics 📊</h2>
              <p className="text-slate-500 dark:text-white/60 text-sm mt-1">Track your study habits, quiz performance, and weak areas.</p>
            </div>
            <div className="bg-white dark:bg-[#06060a] rounded-2xl p-5 border border-slate-100 dark:border-white/10 shadow-sm mb-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                🎯 Recommended Next Steps
              </h3>

              {recommendations.map((rec, i) => (
                <p key={i} className="text-xs text-slate-600 dark:text-white/80 mb-1">
                  • {rec}
                </p>
              ))}
            </div>
            <div className="bg-white dark:bg-[#06060a] rounded-2xl p-5 border border-slate-100 dark:border-white/10 shadow-sm mb-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                🔁 Revision Plan
              </h3>

              {revisionPlan.map((r, i) => (
                <p key={i} className="text-xs text-slate-600 dark:text-white/80">
                  • {r.topic} → {r.reviseOn}
                </p>
              ))}
            </div>

            {/* Existing */}
            <AnalyticsDashboard />
          </>
        )}

        {/* ══ Profile ══ */}
        {activeTab === 'Profile' && (
          <div className="max-w-md mx-auto">
            <h2 className="text-slate-800 dark:text-white text-xl font-bold mb-6">Profile</h2>
            <div className="bg-white dark:bg-[#06060a] rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-white/10">
                <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-700 dark:text-violet-300 font-bold text-2xl shrink-0">
                  {user.initial}
                </div>
                <div className="min-w-0">
                  <p className="text-slate-800 dark:text-white font-bold text-lg truncate">{user.name}</p>
                  <p className="text-slate-400 dark:text-white/60 text-sm truncate">{user.email}</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Full Name', value: user.name, badge: null },
                  { label: 'Email', value: user.email, badge: null },
                  { label: 'Account Status', value: 'Verified', badge: 'emerald' },
                  { label: 'Study Materials', value: `${totalPdfs} PDFs`, badge: 'violet' },
                  { label: 'Total Subjects', value: `${allSubjects.length} Subjects`, badge: 'violet' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-white/5 last:border-0">
                    <p className="text-slate-400 dark:text-white/60 text-sm">{row.label}</p>
                    {row.badge ? (
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${row.badge === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'}`}>
                        {row.value}
                      </span>
                    ) : (
                      <p className="text-slate-700 dark:text-white/90 text-sm font-medium truncate max-w-[180px]">{row.value}</p>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={handleLogout}
                className="mt-6 w-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                  font-medium py-3 rounded-2xl transition-colors text-sm border border-red-100 dark:border-red-500/20">Sign Out</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}