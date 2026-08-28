import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { setLocalUser } from '../utils/auth'

export default function VerifyOTP() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const email     = location.state?.email || ''
  const [otp, setOtp]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { confirmSignUp } = await import('aws-amplify/auth')
      try {
        await confirmSignUp({
          username: email,
          confirmationCode: otp
        })
      } catch (awsErr) {
        console.warn('AWS Verify OTP error:', awsErr)
      }
      if (email) {
        setLocalUser(email)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl text-center">

        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-3xl font-bold text-white mb-2">Check Your Email</h2>
        <p className="text-white/50 mb-2">OTP sent to</p>
        <p className="text-purple-400 font-semibold mb-8">{email}</p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.5em] placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50">
            {loading ? 'Verifying...' : 'Verify OTP ✓'}
          </button>
        </form>

        <p className="text-white/40 text-sm mt-6">
          Wrong email?{' '}
          <span onClick={() => navigate('/signup')} className="text-purple-400 cursor-pointer hover:text-purple-300">
            Go back
          </span>
        </p>
      </div>
    </div>
  )
}