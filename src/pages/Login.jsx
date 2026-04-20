import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from 'aws-amplify/auth'

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔐</div>
          <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
          <p className="text-white/50 mt-1">Login to your account</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-white/70 text-sm mb-1 block">Email Address</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login →'}
          </button>
        </form>

        <p className="text-white/40 text-center mt-6 text-sm">
          No account?{' '}
          <span onClick={() => navigate('/signup')} className="text-purple-400 hover:text-purple-300 cursor-pointer">
            Sign Up
          </span>
        </p>
      </div>
    </div>
  )
}