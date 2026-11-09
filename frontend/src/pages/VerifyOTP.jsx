import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import AuthLayout, { FormError } from '../components/auth/AuthLayout'
import { Button, Input, useToast } from '../components/ui'
import { confirmSignUp, resendSignUpCode, AUTH_PROVIDER } from '../lib/auth'

// Only used with Cognito (email verification). Local accounts don't need it.
export default function VerifyOTP() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { toast } = useToast()
  const email = state?.email || ''
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (AUTH_PROVIDER !== 'cognito' || !email) {
    return (
      <AuthLayout title="Nothing to verify" subtitle="Your account doesn't need email verification.">
        <Link to="/login"><Button className="w-full" size="lg">Go to sign in</Button></Link>
      </AuthLayout>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await confirmSignUp(email, code.trim())
      toast('Email verified. Please sign in.', 'success')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Check your email" subtitle={`We sent a 6-digit code to ${email}.`}>
      <FormError>{error}</FormError>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Verification code" icon={KeyRound} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={code.length < 6}>Verify email</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => resendSignUpCode(email).then(() => toast('A new code was sent.', 'success')).catch(e => setError(e.message))}>Resend code</Button>
      </form>
    </AuthLayout>
  )
}
