import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">

        <div className="text-6xl mb-6">🎓</div>

        <h1 className="text-5xl font-bold text-white mb-4">
          StudyMate
        </h1>

        <p className="text-white/60 text-lg mb-10">
          Your personal study assistant — sign up in seconds with OTP login
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/signup')}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200">
            Get Started →
          </button>
          <button
            onClick={() => navigate('/login')}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 border border-white/20">
            Login
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-16">
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">🔐</div>
            <p className="text-white font-semibold">OTP Login</p>
            <p className="text-white/50 text-sm">No password needed</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">☁️</div>
            <p className="text-white font-semibold">AWS Powered</p>
            <p className="text-white/50 text-sm">Cognito + DynamoDB</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-white font-semibold">Super Fast</p>
            <p className="text-white/50 text-sm">Built with Vite React</p>
          </div>
        </div>

      </div>
    </div>
  )
}