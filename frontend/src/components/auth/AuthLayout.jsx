import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpenCheck, Code2, Sparkles, Video } from 'lucide-react'
import { Logo } from '../ui'
import ThemeToggle from '../ThemeToggle'

const POINTS = [
  { icon: Sparkles, title: 'StudyMate AI', text: 'Ask questions about your own PDFs, with page citations.' },
  { icon: BookOpenCheck, title: 'Summaries & quizzes', text: 'Turn any chapter into a study guide and a graded quiz.' },
  { icon: Code2, title: 'Coding Arena', text: 'Real execution in C++, Java, Python and JavaScript.' },
  { icon: Video, title: 'Study rooms', text: 'Meet with classmates over video, with chat built in.' },
]

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-canvas grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 border-r">
        <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-accent/25 blur-[120px]" aria-hidden />
        <div className="absolute bottom-[-180px] right-[-120px] w-[460px] h-[460px] rounded-full bg-accent-2/20 blur-[120px]" aria-hidden />
        <Link to="/" className="relative w-fit"><Logo /></Link>
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink">
            Your study materials,<br /><span className="text-gradient">now they talk back.</span>
          </h2>
          <ul className="mt-10 space-y-5">
            {POINTS.map((p, i) => (
              <motion.li key={p.title} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="flex gap-4">
                <span className="w-10 h-10 rounded-xl glass border flex items-center justify-center shrink-0"><p.icon className="w-[18px] h-[18px] text-accent-ink" /></span>
                <span><span className="block text-ink font-medium text-sm">{p.title}</span><span className="block text-ink-3 text-sm">{p.text}</span></span>
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="relative text-ink-3 text-xs">© {new Date().getFullYear()} MindScape</p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col px-5 sm:px-10 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden"><Logo /></Link>
          <span className="hidden lg:block" />
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-[400px]">
            <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="text-ink-3 text-sm mt-1.5">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-sm text-ink-3 text-center">{footer}</div>}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

export function FormError({ children }) {
  if (!children) return null
  return <div role="alert" className="mb-5 rounded-xl border border-bad/25 bg-bad/10 text-bad text-sm px-4 py-3">{children}</div>
}
