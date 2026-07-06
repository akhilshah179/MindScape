import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Signup from './pages/Signup'
import VerifyOTP from './pages/VerifyOTP'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Meeting from './pages/Meeting'
import ProtectedRoute from './components/ProtectedRoute'

// Coding Arena
import CodingArena from './pages/coding/CodingArena'
import CodingDashboard from './pages/coding/CodingDashboard'
import ProblemsPage from './pages/coding/ProblemsPage'
import ProblemDetail from './pages/coding/ProblemDetail'
import ContestsPage from './pages/coding/ContestsPage'
import ContestDetail from './pages/coding/ContestDetail'
import InterviewPage from './pages/coding/InterviewPage'
import LiveCodingRoom from './components/coding/LiveCodingRoom'

// StudyMate AI
import StudyMateAI from './pages/ai/StudyMateAI'
import AIChatPage from './pages/ai/AIChatPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<VerifyOTP />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meeting/:roomId"
          element={
            <ProtectedRoute>
              <Meeting />
            </ProtectedRoute>
          }
        />

        {/* Coding Arena Routes */}
        <Route
          path="/coding"
          element={
            <ProtectedRoute>
              <CodingArena />
            </ProtectedRoute>
          }
        >
          <Route index element={<CodingDashboard />} />
          <Route path="dashboard" element={<CodingDashboard />} />
          <Route path="problems" element={<ProblemsPage />} />
          <Route path="problem/:id" element={<ProblemDetail />} />
          <Route path="contests" element={<ContestsPage />} />
          <Route path="contest/:id" element={<ContestDetail />} />
          <Route path="interview" element={<InterviewPage />} />
          <Route path="room/:roomId" element={<LiveCodingRoom />} />
        </Route>

        {/* StudyMate AI Routes */}
        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <StudyMateAI />
            </ProtectedRoute>
          }
        >
          <Route index element={<AIChatPage />} />
          <Route path="chat/:chatId" element={<AIChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}