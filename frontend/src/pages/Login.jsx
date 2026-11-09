import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import AuthLayout, { FormError } from '../components/auth/AuthLayout'
import { Button, Input } from '../components/ui'
import { signIn } from '../lib/auth'

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard')

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(params.get('expired') ? 'Your session expired. Please sign in again.' : '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await signIn(email.trim(), password)
      if (res.nextStep === 'CONFIRM_SIGN_UP') return navigate('/verify', { state: { email: email.trim() } })
      navigate(safeNext(params.get('next')), { replace: true })
    } catch (err) {
      // Every failure is shown; there is no "offline" fallback session.
      setError(err.message || 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue learning."
      footer={<>New to MindScape? <Link to="/signup" className="text-accent-ink font-medium hover:underline">Create an account</Link></>}>
      <FormError>{error}</FormError>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@university.edu" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input label="Password" type="password" icon={Lock} autoComplete="current-password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required />
        <Button type="submit" size="lg" className="w-full !mt-6" loading={loading} disabled={!email || !password}>Sign in</Button>
      </form>
    </AuthLayout>
  )
}
