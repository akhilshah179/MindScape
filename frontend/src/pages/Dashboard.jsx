import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Code2, Flame, FolderPlus, GraduationCap, LogOut, MessageSquare, Moon, Sparkles, Sun, Trash2, Trophy, Video } from 'lucide-react'
import { Avatar, Badge, Button, Card, ConfirmDialog, Input, Modal, Segmented, Skeleton, useToast } from '../components/ui'
import FileList from '../components/FileList'
import UploadDropzone from '../components/files/UploadDropzone'
import AnalyticsDashboard from '../components/AnalyticsDashboard'
import ProductivityDashboard from '../components/ProductivityDashboard'
import ErrorBoundary from '../components/ErrorBoundary'
import { useAuth } from '../context/AuthContext'
import { useCloudSync } from '../hooks/useCloudSync'
import { useQuizScores, useSessionTimer, useStreak, getRevisionPlan } from '../hooks/useStudyTracker'
import { useRecommendations } from '../hooks/useRecommendations'
import { useTheme } from '../hooks/useTheme'
import { getAllFiles } from '../services/fileApi'
import { getUserChats } from '../services/ai/chatApi'
import { fetchGamification } from '../services/coding/codingApi'

const PALETTE = { violet: '#8b5cf6', rose: '#f43f5e', sky: '#0ea5e9', emerald: '#10b981', amber: '#f59e0b', orange: '#f97316', indigo: '#6366f1', teal: '#14b8a6' }
const DEFAULT_SUBJECTS = [
  { name: 'Artificial Intelligence', color: 'violet' },
  { name: 'Machine Learning', color: 'rose' },
  { name: 'Cloud Computing', color: 'sky' },
]
const TABS = [
  { value: 'overview', label: 'Overview' }, { value: 'library', label: 'Library' },
  { value: 'productivity', label: 'Productivity' }, { value: 'analytics', label: 'Analytics' }, { value: 'profile', label: 'Profile' },
]
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const abbr = (n) => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

function Stat({ icon: Icon, label, value, hint, loading }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-ink-3 text-xs font-medium"><Icon className="w-4 h-4" />{label}</div>
      {loading ? <Skeleton className="h-8 w-16 mt-3" /> : <p className="font-display text-[28px] font-semibold text-ink mt-2 leading-none tabular-nums">{value}</p>}
      {hint && <p className="text-xs text-ink-3 mt-2 truncate">{hint}</p>}
    </Card>
  )
}

function ModuleCard({ to, icon: Icon, title, text, tone }) {
  return (
    <Link to={to} className="group block">
      <Card interactive className="p-5 h-full relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-35 transition-opacity" style={{ background: tone }} />
        <span className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-card" style={{ background: tone }}><Icon className="w-5 h-5" /></span>
        <p className="relative mt-4 font-semibold text-ink">{title}</p>
        <p className="relative text-sm text-ink-3 mt-1">{text}</p>
        <span className="relative mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent-ink">Open <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></span>
      </Card>
    </Link>
  )
}

function SubjectSection({ subject, files, loading, custom, onUploaded, onDeleted, onRemove }) {
  const { toast } = useToast()
  const color = PALETTE[subject.color] || PALETTE.violet
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: color }}>{abbr(subject.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink truncate">{subject.name}</p>
          <p className="text-xs text-ink-3">{files.length} PDF{files.length === 1 ? '' : 's'}</p>
        </div>
        <UploadDropzone compact subjectName={subject.name} onUploaded={(f, msg) => { onUploaded(f); toast(f.hasText === false ? msg : `Uploaded "${f.originalName}"`, f.hasText === false ? 'info' : 'success', f.hasText === false ? 7000 : 4000) }} onError={m => toast(m, 'error')} />
        {custom && <button onClick={onRemove} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-bad hover:bg-bad/10" aria-label={`Remove ${subject.name}`}><Trash2 className="w-4 h-4" /></button>}
      </div>
      <FileList files={files} loading={loading} onDeleted={onDeleted} />
    </Card>
  )
}

export default function Dashboard() {
  const { user, preferences, updatePreferences, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(t => t.value === params.get('tab')) ? params.get('tab') : 'overview'
  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })

  const [files, setFiles] = useState(null)
  const [chats, setChats] = useState(null)
  const [game, setGame] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [removeSubject, setRemoveSubject] = useState(null)

  useCloudSync(user?.userId)
  useSessionTimer('General')
  const { streak, tickStreak } = useStreak()
  const { scores, weakTopics, isLoading: scoresLoading } = useQuizScores()
  const { recommendations } = useRecommendations()
  const { theme, toggleTheme } = useTheme()
  useEffect(() => { tickStreak() }, [tickStreak])

  useEffect(() => {
    getAllFiles().then(setFiles).catch(err => { setFiles([]); toast(`Couldn't load your library: ${err.message}`, 'error') })
    getUserChats().then(setChats).catch(() => setChats([]))
    fetchGamification().then(setGame).catch(() => setGame(false))
  }, [toast])

  const customSubjects = useMemo(() => preferences.subjects || [], [preferences.subjects])
  const subjects = useMemo(() => {
    const all = [...DEFAULT_SUBJECTS, ...customSubjects]
    // Any subject that has files but isn't listed (e.g. created elsewhere) still shows up.
    for (const f of files || []) if (!all.some(s => s.name === f.subjectName)) all.push({ name: f.subjectName, color: 'indigo' })
    return all
  }, [customSubjects, files])
  const bySubject = useMemo(() => (files || []).reduce((m, f) => { (m[f.subjectName] ||= []).push(f); return m }, {}), [files])

  const addSubject = async (e) => {
    e.preventDefault()
    const name = newSubject.trim()
    if (!name) return
    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) return toast('That subject already exists.', 'error')
    const colors = Object.keys(PALETTE)
    try {
      await updatePreferences({ subjects: [...customSubjects, { name, color: colors[(customSubjects.length + 3) % colors.length] }] })
      setNewSubject(''); setAddOpen(false); toast(`Added "${name}"`, 'success')
    } catch (err) { toast(err.message, 'error') }
  }
  const doRemoveSubject = async () => {
    try { await updatePreferences({ subjects: customSubjects.filter(s => s.name !== removeSubject.name) }); setRemoveSubject(null) } catch (err) { toast(err.message, 'error') }
  }
  const onUploaded = useCallback((f) => setFiles(prev => [f, ...(prev || [])]), [])
  const onDeleted = useCallback((f) => setFiles(prev => prev.filter(x => x.fileId !== f.fileId)), [])

  const avgScore = scores.length ? Math.round(scores.reduce((a, s) => a + (s.pct || 0), 0) / scores.length) : null
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-ink-3">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-ink mt-1">{greeting()}, {firstName}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Video} onClick={() => navigate('/meetings')}>Meet</Button>
          <Button icon={Sparkles} onClick={() => navigate('/ai')}>Ask StudyMate</Button>
        </div>
      </div>

      <div className="overflow-x-auto thin-scroll -mx-1 px-1 mb-6"><Segmented layoutId="dash-tab" value={tab} onChange={setTab} options={TABS} /></div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Stat icon={BookOpen} label="Study materials" value={files?.length ?? 0} loading={files === null} hint={`${subjects.length} subjects`} />
              <Stat icon={GraduationCap} label="Quiz average" value={avgScore === null ? '—' : `${avgScore}%`} loading={scoresLoading} hint={`${scores.length} quiz${scores.length === 1 ? '' : 'zes'} taken`} />
              <Stat icon={Flame} label="Study streak" value={`${streak.count || 0}d`} hint={`Best ${streak.longestStreak || 0} days`} />
              <Stat icon={Trophy} label="Coding level" value={game ? `Lv ${game.level || 0}` : '—'} loading={game === null} hint={game ? `${game.xp || 0} XP · ${game.totalSolved || 0} solved` : 'Solve a problem to start'} />
            </div>

            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
              <ModuleCard to="/ai" icon={Sparkles} title="StudyMate AI" text="Chat, summarise PDFs and generate quizzes." tone="linear-gradient(135deg,#8b5cf6,#3b82f6)" />
              <ModuleCard to="/coding" icon={Code2} title="Coding Arena" text="Practise DSA with real judging and AI reviews." tone="linear-gradient(135deg,#6366f1,#06b6d4)" />
              <ModuleCard to="/meetings" icon={Video} title="Study rooms" text="Video meetings with chat for group study." tone="linear-gradient(135deg,#10b981,#0ea5e9)" />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3"><p className="font-medium text-ink">Recent conversations</p><Link to="/ai" className="text-xs text-accent-ink hover:underline">View all</Link></div>
                {chats === null ? <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-10" />)}</div>
                  : chats.length === 0 ? <p className="text-sm text-ink-3 py-6 text-center">No chats yet. <Link to="/ai" className="text-accent-ink hover:underline">Start one</Link>.</p>
                    : chats.slice(0, 5).map(c => (
                      <Link key={c.chatId} to={`/ai/chat/${c.chatId}`} className="flex items-center gap-3 p-2.5 -mx-2.5 rounded-xl hover:bg-surface-2">
                        <MessageSquare className="w-4 h-4 text-ink-3 shrink-0" />
                        <span className="text-sm text-ink truncate flex-1">{c.title}</span>
                        <span className="text-[11px] text-ink-3 shrink-0">{new Date(c.updatedAt).toLocaleDateString()}</span>
                      </Link>
                    ))}
              </Card>
              <Card className="p-5">
                <p className="font-medium text-ink mb-3">Recommended next steps</p>
                <ul className="space-y-2">
                  {recommendations.map((r, i) => <li key={i} className="flex gap-2 text-sm text-ink-2"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />{r}</li>)}
                  {getRevisionPlan(weakTopics || []).slice(0, 3).map((r, i) => <li key={`r${i}`} className="flex gap-2 text-sm text-ink-2"><span className="w-1.5 h-1.5 rounded-full bg-warn mt-2 shrink-0" /><span>Revise <span className="text-ink">{r.topic}</span> on {r.reviseOn}</span></li>)}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {tab === 'library' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-ink-3">Files are stored in your account and stay available on every device.</p>
              <Button variant="secondary" size="sm" icon={FolderPlus} onClick={() => setAddOpen(true)}>New subject</Button>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              {subjects.map(s => (
                <SubjectSection key={s.name} subject={s} files={bySubject[s.name] || []} loading={files === null}
                  custom={customSubjects.some(c => c.name === s.name)} onUploaded={onUploaded} onDeleted={onDeleted} onRemove={() => setRemoveSubject(s)} />
              ))}
            </div>
          </div>
        )}

        {tab === 'productivity' && <ErrorBoundary label="Productivity"><ProductivityDashboard /></ErrorBoundary>}
        {tab === 'analytics' && <ErrorBoundary label="Analytics"><AnalyticsDashboard /></ErrorBoundary>}

        {tab === 'profile' && (
          <Card className="max-w-lg p-6">
            <div className="flex items-center gap-4 pb-5 border-b">
              <Avatar name={user?.name} className="w-14 h-14 text-lg" />
              <div className="min-w-0"><p className="font-semibold text-ink truncate">{user?.name}</p><p className="text-sm text-ink-3 truncate">{user?.email}</p></div>
            </div>
            <dl className="divide-y">
              {[['Study materials', `${files?.length ?? 0} PDFs`], ['Subjects', subjects.length], ['Quizzes taken', scores.length], ['Coding XP', game ? game.xp : '—'], ['Badges', game ? (game.badges || []).length : '—']].map(([k, v]) => (
                <div key={k} className="flex justify-between py-3 text-sm"><dt className="text-ink-3">{k}</dt><dd className="text-ink font-medium">{v}</dd></div>
              ))}
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-ink-3">Theme</dt>
                <dd><Button variant="secondary" size="sm" icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</Button></dd>
              </div>
            </dl>
            {game?.badges?.length > 0 && <div className="flex flex-wrap gap-1.5 pt-4">{game.badges.map(b => <Badge key={b.id} tone="accent">{b.icon} {b.name}</Badge>)}</div>}
            <Button variant="danger" icon={LogOut} className="w-full mt-6" onClick={async () => { await signOut(); navigate('/login', { replace: true }) }}>Sign out</Button>
          </Card>
        )}
      </motion.div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New subject" size="sm">
        <form onSubmit={addSubject} className="p-6 space-y-4">
          <Input label="Subject name" placeholder="e.g. Data Structures" value={newSubject} onChange={e => setNewSubject(e.target.value)} maxLength={60} autoFocus />
          <Button type="submit" className="w-full" disabled={!newSubject.trim()}>Add subject</Button>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(removeSubject)} onClose={() => setRemoveSubject(null)} title="Remove subject?" confirmLabel="Remove"
        message={`"${removeSubject?.name}" will be removed from your list. ${bySubject[removeSubject?.name]?.length ? 'Its PDFs are kept and will still appear in the library.' : ''}`} onConfirm={doRemoveSubject} />
    </div>
  )
}
