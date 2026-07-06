import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const navigate  = useNavigate()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const { signIn, signOut } = await import('aws-amplify/auth')

    // 🔥 ADD THIS LINE
    await signOut()

    await signIn({ username: email, password })
    navigate('/dashboard')

  } catch (err) {
    setError(err.message)
  }

  setLoading(false)
}

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#06060a] font-sans px-4 transition-colors duration-500">
      <ThemeToggle />
      {/* ── Background Effects ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-600/20 blur-[140px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[140px] rounded-full animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-fuchsia-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] mix-blend-multiply dark:mix-blend-screen" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      </div>

      <div className="relative z-10 bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-8 sm:p-10 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.3)]">

        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-5 shadow-sm dark:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <svg className="w-6 h-6 text-violet-600 dark:text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-white/60">Welcome Back</h2>
          <p className="text-slate-500 dark:text-white/40 mt-2 text-sm font-medium">Log in to your StudyMate account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 mb-6 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-slate-600 dark:text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 block">Email Address</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-slate-50 dark:focus:bg-white/10 transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-slate-600 dark:text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 block">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-slate-50 dark:focus:bg-white/10 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-black font-bold py-4 rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] disabled:opacity-50 disabled:hover:scale-100 mt-2 flex items-center justify-center gap-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Logging in...
              </span>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        <p className="text-slate-500 dark:text-white/40 text-center mt-8 text-sm">
          Don't have an account?{' '}
          <span onClick={() => navigate('/signup')} className="text-slate-900 dark:text-white font-medium hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer transition-colors">
            Sign up
          </span>
        </p>
      </div>
    </div>
  )
}