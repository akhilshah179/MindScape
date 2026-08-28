import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getAuthUser } from '../utils/auth'

export default function ProtectedRoute({ children }) {
    const [status, setStatus] = useState('checking')

    useEffect(() => {
        getAuthUser()
            .then(() => setStatus('auth'))
            .catch(() => setStatus('unauth'))
    }, [])

    if (status === 'checking') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
        )
    }

    if (status === 'unauth') {
        return <Navigate to="/login" replace />
    }

    return children
}