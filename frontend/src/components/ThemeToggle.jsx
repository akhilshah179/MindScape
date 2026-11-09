import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { cx } from './ui'

export default function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className={cx('relative w-10 h-10 inline-flex items-center justify-center rounded-xl text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors overflow-hidden', className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ y: -14, opacity: 0, rotate: -40 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 14, opacity: 0, rotate: 40 }} transition={{ duration: 0.2 }}>
          {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
