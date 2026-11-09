import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, Award, BookOpenCheck, Brain, CheckCircle2, Code2, FileText, Flame, ListChecks, MessageSquare, Sparkles, Upload, Users, Video, Zap } from 'lucide-react'
import { Button, Logo } from '../components/ui'
import ThemeToggle from '../components/ThemeToggle'
import ErrorBoundary from '../components/ErrorBoundary'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../context/AuthContext'
import { SceneFallback, webglAvailable } from '../components/landing/sceneFallback'

gsap.registerPlugin(ScrollTrigger)
const KnowledgeScene = lazy(() => import('../components/landing/KnowledgeScene'))

const FEATURES = [
  { id: 'studymate', icon: Sparkles, kicker: 'StudyMate AI', title: 'A tutor that knows your syllabus', text: 'Ask anything and get structured, accurate explanations. StudyMate remembers your goals, weak topics and exam dates to personalise every answer.',
    visual: 'chat' },
  { id: 'pdf', icon: FileText, kicker: 'PDF learning', title: 'Turn chapters into study guides', text: 'Upload lecture notes or textbook PDFs. Get saved, structured summaries and ask questions answered straight from the document — with page citations.',
    visual: 'pdf' },
  { id: 'quiz', icon: ListChecks, kicker: 'Quizzes', title: 'Test yourself, track progress', text: 'Generate multiple-choice quizzes from any document. Answers are graded, explained and tracked so you know exactly what to revise next.',
    visual: 'quiz' },
  { id: 'coding', icon: Code2, kicker: 'Coding Arena', title: 'Practise with real judging', text: 'Solve DSA problems in C++, Java, Python or JavaScript. Code is executed against hidden test cases — Accepted only when it truly passes. AI hints, debugging and reviews included.',
    visual: 'code' },
  { id: 'gamify', icon: Award, kicker: 'Gamification', title: 'Levels, streaks and badges', text: 'Earn XP for every new solve, keep your streak alive, unlock badges and climb contest leaderboards with classmates.',
    visual: 'xp' },
  { id: 'meet', icon: Video, kicker: 'Study rooms', title: 'Learn together, live', text: 'Start a video room in one click. Screen share, chat and see who is speaking — built for group study and project work.',
    visual: 'meet' },
]

function Visual({ kind }) {
  const box = 'card p-5 w-full max-w-md mx-auto shadow-lift'
  if (kind === 'chat') return (
    <div className={box}>
      <div className="flex justify-end"><span className="rounded-2xl rounded-br-md bg-accent text-white text-sm px-3.5 py-2">Explain backpropagation simply</span></div>
      <div className="flex gap-2 mt-4"><span className="w-7 h-7 rounded-lg bg-accent-gradient flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5 text-white" /></span>
        <div className="text-sm text-ink-2 space-y-1.5"><p><strong className="text-ink">Backpropagation</strong> is how a network learns from mistakes:</p><p>• Compare the prediction with the answer</p><p>• Send the error backwards, layer by layer</p><p>• Nudge each weight to reduce the error</p></div></div>
    </div>)
  if (kind === 'pdf') return (
    <div className={box}>
      <div className="flex items-center gap-2 pb-3 border-b"><span className="w-8 h-8 rounded-lg bg-bad/10 text-bad flex items-center justify-center"><FileText className="w-4 h-4" /></span><span className="text-sm text-ink">ml-unit1.pdf</span><span className="ml-auto text-[11px] text-ink-3">12 pages</span></div>
      <p className="text-xs font-semibold text-ink mt-3">Core concepts</p>
      {['Supervised learning uses labelled data (p. 2)', 'Overfitting: memorising noise (p. 5)', 'Bias–variance trade-off (p. 7)'].map(t => <p key={t} className="text-sm text-ink-2 mt-1.5 flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />{t}</p>)}
    </div>)
  if (kind === 'quiz') return (
    <div className={box}>
      <p className="text-xs text-ink-3">Question 2 of 5</p>
      <p className="text-sm text-ink font-medium mt-1">Which technique reduces overfitting?</p>
      {['Adding more layers', 'L2 regularisation', 'Increasing learning rate', 'Removing validation data'].map((o, i) => (
        <div key={o} className={`mt-2 flex items-center gap-2 p-2.5 rounded-xl border text-sm ${i === 1 ? 'border-ok/50 bg-ok/10 text-ink' : 'text-ink-2'}`}><span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${i === 1 ? 'bg-ok text-white' : 'bg-surface-3'}`}>{'ABCD'[i]}</span>{o}{i === 1 && <CheckCircle2 className="w-4 h-4 text-ok ml-auto" />}</div>))}
    </div>)
  if (kind === 'code') return (
    <div className={`${box} font-mono text-[12px] !p-0 overflow-hidden`}>
      <div className="px-4 py-2 border-b text-ink-3 text-[11px] flex justify-between"><span>solution.py</span><span>Python 3.12</span></div>
      <pre className="px-4 py-3 text-ink-2 leading-relaxed">{`def twoSum(self, nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i`}</pre>
      <div className="px-4 py-2.5 border-t flex items-center gap-3 font-sans text-xs"><span className="text-ok font-semibold">Accepted</span><span className="text-ink-3">3/3 tests · 0.02s</span><span className="ml-auto text-accent-ink inline-flex items-center gap-1"><Zap className="w-3.5 h-3.5" />+50 XP</span></div>
    </div>)
  if (kind === 'xp') return (
    <div className={box}>
      <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-xl bg-accent-gradient text-white font-bold flex items-center justify-center shadow-glow">7</span><div className="flex-1"><p className="text-sm text-ink">Level 7</p><div className="h-2 rounded-full bg-surface-3 mt-1.5 overflow-hidden"><div className="h-full w-[68%] bg-accent-gradient" /></div></div><span className="text-xs text-warn inline-flex items-center gap-1"><Flame className="w-4 h-4" />12d</span></div>
      <div className="flex flex-wrap gap-2 mt-4">{['🗡️ First Blood', '🔥 On Fire', '🌐 Polyglot', '⏱️ Speed Demon', '🏆 Contest Warrior'].map(b => <span key={b} className="text-xs px-2.5 h-7 inline-flex items-center rounded-lg bg-surface-2 border text-ink-2">{b}</span>)}</div>
    </div>)
  return (
    <div className={`${box} !p-3`}>
      <div className="grid grid-cols-2 gap-2">{['Aisha', 'Ben', 'Chen', 'You'].map((n, i) => <div key={n} className={`aspect-video rounded-xl bg-surface-3 relative flex items-center justify-center ${i === 0 ? 'ring-2 ring-accent' : ''}`}><span className="w-10 h-10 rounded-full bg-accent/20 text-accent-ink text-sm font-semibold flex items-center justify-center">{n[0]}</span><span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 rounded bg-black/50 text-white">{n}</span></div>)}</div>
      <div className="flex justify-center gap-2 mt-3">{[Users, MessageSquare, Video].map((I, i) => <span key={i} className="w-9 h-9 rounded-xl bg-surface-2 border flex items-center justify-center text-ink-2"><I className="w-4 h-4" /></span>)}<span className="w-12 h-9 rounded-xl bg-bad text-white flex items-center justify-center text-xs">Leave</span></div>
    </div>)
}

export default function Landing() {
  const { theme } = useTheme()
  const { status } = useAuth()
  const root = useRef(null)
  const progress = useRef(0)
  const [show3d, setShow3d] = useState(false)
  const canWebgl = useMemo(() => webglAvailable(), [])

  // Load the 3D scene after first paint so text is interactive immediately
  useEffect(() => {
    const id = (window.requestIdleCallback || ((cb) => setTimeout(cb, 200)))(() => setShow3d(true))
    return () => (window.cancelIdleCallback || clearTimeout)(id)
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { progress.current = s.progress } })
      if (reduce) return
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        gsap.from(el, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } })
      })
      gsap.utils.toArray('[data-visual]').forEach((el) => {
        gsap.from(el, { y: 60, rotateX: 8, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  const cta = status === 'authed' ? { to: '/dashboard', label: 'Open dashboard' } : { to: '/signup', label: 'Get started — it’s free' }

  return (
    <div ref={root} className="bg-canvas text-ink min-h-screen overflow-x-hidden">
      <header className="fixed top-0 inset-x-0 z-50 glass border-b">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-6">
          <Link to="/"><Logo /></Link>
          <nav className="hidden md:flex gap-6 text-sm text-ink-3">{[['Features', '#features'], ['How it works', '#how'], ['Coding', '#coding']].map(([l, h]) => <a key={h} href={h} className="hover:text-ink">{l}</a>)}</nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {status !== 'authed' && <Link to="/login" className="hidden sm:inline-flex text-sm text-ink-2 hover:text-ink px-3">Sign in</Link>}
            <Link to={cta.to}><Button size="sm">{status === 'authed' ? 'Dashboard' : 'Get started'}</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="relative min-h-[100svh] flex items-center pt-16">
        <div className="absolute inset-0 grid-bg opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
        <div className="absolute inset-0 lg:left-[38%]">
          {canWebgl && show3d
            ? <ErrorBoundary label="3D scene"><Suspense fallback={<SceneFallback />}><KnowledgeScene progress={progress} light={theme === 'light'} /></Suspense></ErrorBoundary>
            : <SceneFallback />}
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} className="max-w-xl">
            <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full glass border text-xs text-ink-2"><Brain className="w-3.5 h-3.5 text-accent-ink" />An intelligent learning ecosystem</span>
            <h1 className="font-display text-[42px] sm:text-6xl font-semibold tracking-tight leading-[1.05] mt-5">Learn faster.<br /><span className="text-gradient">Build smarter.</span></h1>
            <p className="text-ink-2 text-base sm:text-lg mt-5 max-w-lg">MindScape brings an AI tutor, your study PDFs, real coding practice and live study rooms into one place — so every hour of study counts.</p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to={cta.to}><Button size="lg" iconRight={ArrowRight}>{cta.label}</Button></Link>
              <a href="#features"><Button size="lg" variant="secondary">See what's inside</Button></a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-xs text-ink-3">{['PDF answers with page citations', '4 languages, real judging', 'Free for students'].map(t => <span key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-ok" />{t}</span>)}</div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 space-y-24 sm:space-y-32">
        <div data-reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm text-accent-ink font-medium">Everything in one place</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">One platform for the whole learning loop</h2>
          <p className="text-ink-3 mt-3">Understand, practise, test and collaborate — without juggling five apps.</p>
        </div>
        {FEATURES.map((f, i) => (
          <div key={f.id} id={f.id === 'coding' ? 'coding' : undefined} className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
            <div data-reveal>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-accent-ink"><f.icon className="w-4 h-4" />{f.kicker}</span>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mt-3">{f.title}</h3>
              <p className="text-ink-2 mt-3 leading-relaxed">{f.text}</p>
            </div>
            <div data-visual style={{ perspective: 1000 }}><Visual kind={f.visual} /></div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-surface/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <h2 data-reveal className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center">How MindScape works</h2>
          <div className="grid md:grid-cols-3 gap-4 mt-12">
            {[[Upload, 'Bring your material', 'Upload course PDFs to your private library, organised by subject.'], [BookOpenCheck, 'Learn with AI', 'Summaries, cited answers and quizzes generated from your own documents.'], [Code2, 'Practise and compete', 'Solve problems, earn XP, join contests and study together live.']].map(([I, t, d], i) => (
              <div key={t} data-reveal className="card p-6">
                <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-accent/10 text-accent-ink flex items-center justify-center"><I className="w-5 h-5" /></span><span className="font-display text-3xl text-ink-3/50 font-semibold">0{i + 1}</span></div>
                <p className="font-semibold mt-4">{t}</p><p className="text-sm text-ink-3 mt-1">{d}</p>
              </div>))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div data-reveal className="relative overflow-hidden rounded-3xl border p-10 sm:p-16 text-center">
          <div className="absolute inset-0 bg-accent-gradient opacity-[0.12]" aria-hidden />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-accent/30 blur-[100px]" aria-hidden />
          <h2 className="relative font-display text-3xl sm:text-5xl font-semibold tracking-tight">Your next study session<br />starts here.</h2>
          <p className="relative text-ink-2 mt-4">Create an account in under a minute.</p>
          <Link to={cta.to} className="relative inline-block mt-8"><Button size="lg" iconRight={ArrowRight}>{cta.label}</Button></Link>
        </div>
      </section>

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-3">
          <Logo />
          <nav className="flex gap-5"><Link to="/login" className="hover:text-ink">Sign in</Link><Link to="/signup" className="hover:text-ink">Sign up</Link><a href="#features" className="hover:text-ink">Features</a></nav>
          <p>© {new Date().getFullYear()} MindScape</p>
        </div>
      </footer>
    </div>
  )
}
