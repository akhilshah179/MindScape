import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, User } from 'lucide-react'
import AuthLayout, { FormError } from '../components/auth/AuthLayout'
import { Button, Input, cx } from '../components/ui'
import { signUp } from '../lib/auth'

function strength(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++
  return s
}

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const s = strength(form.password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    setLoading(true)
    setError('')
    try {
      const res = await signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      if (res.nextStep === 'CONFIRM_SIGN_UP') return navigate('/verify', { state: { email: form.email.trim() } })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Sign up failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Free forever for students."
      footer={<>Already have an account? <Link to="/login" className="text-accent-ink font-medium hover:underline">Sign in</Link></>}>
      <FormError>{error}</FormError>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Full name" icon={User} autoComplete="name" placeholder="Ada Lovelace" value={form.name} onChange={set('name')} required />
        <Input label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@university.edu" value={form.email} onChange={set('email')} required />
        <div>
          <Input label="Password" type="password" icon={Lock} autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} required />
          {form.password && (
            <div className="flex gap-1 mt-2" aria-label={`Password strength ${s} of 4`}>
              {[0, 1, 2, 3].map(i => (
                <span key={i} className={cx('h-1 flex-1 rounded-full transition-colors', i < s ? (s <= 1 ? 'bg-bad' : s === 2 ? 'bg-warn' : 'bg-ok') : 'bg-surface-3')} />
              ))}
            </div>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full !mt-6" loading={loading} disabled={!form.name || !form.email || !form.password}>Create account</Button>
      </form>
    </AuthLayout>
  )
}
