import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import ProtectedRoute, { GuestOnly, FullScreenLoader } from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui'
import AppShell from './components/layout/AppShell'

// Route-level code splitting: Three.js, Monaco and LiveKit load only where used.
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const VerifyOTP = lazy(() => import('./pages/VerifyOTP'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Meetings = lazy(() => import('./pages/Meetings'))
const Meeting = lazy(() => import('./pages/Meeting'))
const CodingArena = lazy(() => import('./pages/coding/CodingArena'))
const CodingDashboard = lazy(() => import('./pages/coding/CodingDashboard'))
const ProblemsPage = lazy(() => import('./pages/coding/ProblemsPage'))
const ProblemDetail = lazy(() => import('./pages/coding/ProblemDetail'))
const ContestsPage = lazy(() => import('./pages/coding/ContestsPage'))
const ContestDetail = lazy(() => import('./pages/coding/ContestDetail'))
const InterviewPage = lazy(() => import('./pages/coding/InterviewPage'))
const StudyMateAI = lazy(() => import('./pages/ai/StudyMateAI'))
const AIChatPage = lazy(() => import('./pages/ai/AIChatPage'))

const shell = (el, opts) => <ProtectedRoute><AppShell {...opts}>{el}</AppShell></ProtectedRoute>

function LegacyMeetingRedirect() {
  const { roomId } = useParams()
  return <Navigate to={`/meetings/${roomId}`} replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<FullScreenLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
                <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
                <Route path="/verify" element={<VerifyOTP />} />

                <Route path="/dashboard" element={shell(<Dashboard />)} />
                <Route path="/meetings" element={shell(<Meetings />)} />
                <Route path="/meetings/:roomId" element={<ProtectedRoute><Meeting /></ProtectedRoute>} />
                <Route path="/meeting/:roomId" element={<LegacyMeetingRedirect />} />

                <Route path="/coding" element={shell(<CodingArena />, { fullBleed: true })}>
                  <Route index element={<CodingDashboard />} />
                  <Route path="dashboard" element={<CodingDashboard />} />
                  <Route path="problems" element={<ProblemsPage />} />
                  <Route path="problem/:id" element={<ProblemDetail />} />
                  <Route path="contests" element={<ContestsPage />} />
                  <Route path="contest/:id" element={<ContestDetail />} />
                  <Route path="interview" element={<InterviewPage />} />
                </Route>

                <Route path="/ai" element={shell(<StudyMateAI />, { fullBleed: true })}>
                  <Route index element={<AIChatPage />} />
                  <Route path="chat/:chatId" element={<AIChatPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
