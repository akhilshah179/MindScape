import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">👤</div>
          <h2 className="text-3xl font-bold text-white">Create Account</h2>
          <p className="text-white/50 mt-1">Join StudyMate today</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-white/70 text-sm mb-1 block">Full Name</label>
            <input
              name="name"
              type="text"
              placeholder="John Doe"
              onChange={handleChange}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="you@email.com"
              onChange={handleChange}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Phone Number</label>
            <input
              name="phone"
              type="tel"
              placeholder="+91 9876543210"
              onChange={handleChange}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm mb-1 block">Password</label>
            <input
              name="password"
              type="password"
              placeholder="Min 8 characters"
              onChange={handleChange}
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Creating Account...' : 'Sign Up →'}
          </button>
        </form>

        <p className="text-white/40 text-center mt-6 text-sm">
          Already have an account?{' '}
          <span onClick={() => navigate('/login')} className="text-purple-400 hover:text-purple-300 cursor-pointer">
            Login
          </span>
        </p>
      </div>
    </div>
  )
}