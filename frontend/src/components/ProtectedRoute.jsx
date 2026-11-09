import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo, Spinner } from './ui'

export function FullScreenLoader({ label = 'Loading…' }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-5" role="status">
      <Logo withText={false} className="scale-125" />
      <div className="flex items-center gap-2 text-ink-3 text-sm"><Spinner className="w-4 h-4" />{label}</div>
    </div>
  )
}

export default function ProtectedRoute({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'anon') return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return children
}

export function GuestOnly({ children }) {
  const { status } = useAuth()
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'authed') return <Navigate to="/dashboard" replace />
  return children
}
