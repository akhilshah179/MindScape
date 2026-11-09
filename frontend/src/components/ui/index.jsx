/* eslint-disable react-refresh/only-export-components */
import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, Info, Loader2 } from 'lucide-react'

export const cx = (...c) => c.filter(Boolean).join(' ')

// ─── Button ────────────────────────────────────────────────────────────────
const BTN_VARIANTS = {
  primary: 'bg-accent-gradient text-white shadow-glow hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface-2 text-ink border hover:bg-surface-3',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2',
  danger: 'bg-bad/10 text-bad border border-bad/20 hover:bg-bad/15',
  outline: 'border text-ink hover:bg-surface-2',
}
const BTN_SIZES = { sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg', md: 'h-10 px-4 text-sm gap-2 rounded-xl', lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl' }

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: IconRight, className, children, disabled, ...props }, ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center font-medium whitespace-nowrap select-none transition-all duration-150',
        'disabled:opacity-50 disabled:pointer-events-none',
        BTN_VARIANTS[variant], BTN_SIZES[size], className
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight className="w-4 h-4 shrink-0" aria-hidden />}
    </button>
  )
})

export const IconButton = forwardRef(function IconButton({ label, icon: Icon, className, size = 'md', active, ...props }, ref) {
  const s = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cx('inline-flex items-center justify-center rounded-xl transition-colors text-ink-2 hover:text-ink hover:bg-surface-2 disabled:opacity-40', active && 'bg-surface-2 text-ink', s, className)}
      {...props}
    >
      <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'} aria-hidden />
    </button>
  )
})

// ─── Surfaces ──────────────────────────────────────────────────────────────
export function Card({ className, children, interactive, as: As = 'div', ...props }) {
  return (
    <As className={cx('card', interactive && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:border-accent/30', className)} {...props}>
      {children}
    </As>
  )
}

export function Badge({ tone = 'neutral', className, children }) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-2 border',
    accent: 'bg-accent/12 text-accent-ink border border-accent/20',
    ok: 'bg-ok/10 text-ok border border-ok/20',
    warn: 'bg-warn/10 text-warn border border-warn/20',
    bad: 'bg-bad/10 text-bad border border-bad/20',
  }
  return <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide', tones[tone], className)}>{children}</span>
}

export function Spinner({ className }) {
  return <Loader2 className={cx('w-5 h-5 animate-spin text-accent', className)} aria-label="Loading" />
}

export function Skeleton({ className }) {
  return <div className={cx('relative overflow-hidden rounded-lg bg-surface-2', className)}><div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[rgb(var(--line)/0.06)] to-transparent" /></div>
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      {Icon && <div className="w-12 h-12 rounded-2xl bg-surface-2 border flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-ink-3" /></div>}
      <p className="text-ink font-semibold">{title}</p>
      {description && <p className="text-ink-3 text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ─── Form fields ───────────────────────────────────────────────────────────
export const Input = forwardRef(function Input({ label, error, hint, className, icon: Icon, id, ...props }, ref) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="block text-xs font-medium text-ink-2 mb-1.5">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" aria-hidden />}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-err` : undefined}
          className={cx(
            'w-full h-11 rounded-xl bg-surface-2 border px-3.5 text-sm text-ink placeholder:text-ink-3 transition-colors',
            'focus:outline-none focus:border-accent/60 focus:ring-4 focus:ring-accent/15',
            Icon && 'pl-10', error && 'border-bad/60'
          )}
          {...props}
        />
      </div>
      {error ? <p id={`${inputId}-err`} className="text-bad text-xs mt-1.5">{error}</p> : hint && <p className="text-ink-3 text-xs mt-1.5">{hint}</p>}
    </div>
  )
})

// ─── Modal ─────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, description, children, size = 'md', footer, className }) {
  const reduce = useReducedMotion()
  const panelRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => panelRef.current?.querySelector('input,textarea,button:not([data-close])')?.focus(), 30)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; clearTimeout(t); prev?.focus?.() }
  }, [open, onClose])
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl', full: 'max-w-[min(1400px,96vw)]' }
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className={cx('relative w-full bg-surface border shadow-lift rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col', widths[size], className)}
          >
            {(title || onClose) && (
              <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b">
                <div className="min-w-0">
                  {title && <h2 className="text-ink font-semibold text-base truncate">{title}</h2>}
                  {description && <p className="text-ink-3 text-sm mt-0.5">{description}</p>}
                </div>
                {onClose && <IconButton data-close label="Close" icon={X} size="sm" onClick={onClose} />}
              </div>
            )}
            <div className="overflow-y-auto thin-scroll flex-1 min-h-0">{children}</div>
            {footer && <div className="px-6 py-4 border-t flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onClose, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </>}
    >
      <p className="px-6 py-5 text-sm text-ink-2 leading-relaxed">{message}</p>
    </Modal>
  )
}

// ─── Toasts ────────────────────────────────────────────────────────────────
const ToastCtx = createContext({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const dismiss = useCallback((id) => setItems(prev => prev.filter(t => t.id !== id)), [])
  const toast = useCallback((message, type = 'info', ms = 4000) => {
    const id = Math.random().toString(36).slice(2)
    setItems(prev => [...prev.slice(-3), { id, message, type }])
    if (ms) setTimeout(() => dismiss(id), ms)
    return id
  }, [dismiss])
  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info }
  const tones = { success: 'text-ok', error: 'text-bad', info: 'text-accent' }
  return (
    <ToastCtx.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed z-[200] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map(t => {
            const Icon = icons[t.type] || Info
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24 }}
                className="pointer-events-auto glass border shadow-lift rounded-xl pl-3 pr-2 py-2.5 flex items-start gap-2.5 w-full sm:w-[360px]">
                <Icon className={cx('w-4 h-4 mt-0.5 shrink-0', tones[t.type])} />
                <p className="text-sm text-ink flex-1 leading-snug">{t.message}</p>
                <button onClick={() => dismiss(t.id)} className="text-ink-3 hover:text-ink p-0.5" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

// ─── Brand ─────────────────────────────────────────────────────────────────
export function Logo({ className, withText = true }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <span className="relative w-8 h-8 rounded-[10px] bg-accent-gradient shadow-glow flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="2.2" /><circle cx="5" cy="7" r="1.6" /><circle cx="19" cy="7" r="1.6" /><circle cx="6.5" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" />
          <path d="M6.3 8l4 2.8M17.7 8l-4 2.8M7.7 17l2.8-3.4M16.3 17l-2.8-3.4" opacity=".85" />
        </svg>
      </span>
      {withText && <span className="font-display font-semibold text-[17px] tracking-tight text-ink">MindScape</span>}
    </span>
  )
}

export function Avatar({ name = '?', className }) {
  const initials = name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  return <span className={cx('inline-flex items-center justify-center rounded-full bg-accent/15 text-accent-ink font-semibold text-xs w-8 h-8 shrink-0', className)}>{initials}</span>
}

// ─── Tabs (segmented) ──────────────────────────────────────────────────────
export function Segmented({ value, onChange, options, className, layoutId = 'seg' }) {
  return (
    <div className={cx('inline-flex p-1 rounded-xl bg-surface-2 border', className)} role="tablist">
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o : o.label
        const active = v === value
        return (
          <button key={v} role="tab" aria-selected={active} onClick={() => onChange(v)}
            className={cx('relative px-3.5 h-8 text-[13px] font-medium rounded-lg transition-colors', active ? 'text-ink' : 'text-ink-3 hover:text-ink-2')}>
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg bg-surface border shadow-sm" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
            <span className="relative">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
