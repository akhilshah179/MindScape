import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { setLocalUser } from '../utils/auth'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { signUp } = await import('aws-amplify/auth')
      try {
        await signUp({
          username: form.email,
          password: form.password,
          options: {
            userAttributes: {
              email: form.email,
              phone_number: form.phone,
              name: form.name,
            }
          }
        })
        navigate('/verify', { state: { email: form.email } })
      } catch (awsErr) {
        console.warn('AWS Signup error:', awsErr)
        setLocalUser(form.email, form.name)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#06060a] font-sans px-4 py-12 transition-colors duration-500">
      <ThemeToggle />
      {/* ── Background Effects ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-600/20 blur-[140px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[140px] rounded-full animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-fuchsia-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] mix-blend-multiply dark:mix-blend-screen" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      </div>

      <div className="relative z-10 bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-8 sm:p-10 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] my-auto">

        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-5 shadow-sm dark:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <svg className="w-6 h-6 text-violet-600 dark:text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-white/60">Create Account</h2>
          <p className="text-slate-500 dark:text-white/40 mt-2 text-sm font-medium">Join StudyMate today</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 mb-6 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-slate-600 dark:text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 block">Full Name</label>
            <input
              name="name"
              type="text"
              placeholder="John Doe"
              onChange={handleChange}
              required
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-slate-50 dark:focus:bg-white/10 transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-slate-600 dark:text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 block">Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="you@email.com"
              onChange={handleChange}
              required
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-slate-50 dark:focus:bg-white/10 transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-slate-600 dark:text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 block">Phone Number</label>
            <input
              name="phone"
              type="tel"
              placeholder="+91 9876543210"
              onChange={handleChange}
              required
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-slate-50 dark:focus:bg-white/10 transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-slate-600 dark:text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 block">Password</label>
            <input
              name="password"
              type="password"
              placeholder="Min 8 characters"
              onChange={handleChange}
              required
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-slate-50 dark:focus:bg-white/10 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-black font-bold py-4 rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] disabled:opacity-50 disabled:hover:scale-100 mt-4 flex items-center justify-center gap-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Creating...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-slate-500 dark:text-white/40 text-center mt-8 text-sm">
          Already have an account?{' '}
          <span onClick={() => navigate('/login')} className="text-slate-900 dark:text-white font-medium hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer transition-colors">
            Log in
          </span>
        </p>
      </div>
    </div>
  )
}