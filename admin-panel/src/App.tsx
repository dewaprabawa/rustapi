import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminLayout from "./layouts/AdminLayout"
import StudentLayout from "./layouts/StudentLayout"

import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Courses from "./pages/Courses"
import Users from "./pages/Users"
import Scenarios from "./pages/Scenarios"
import Gamification from "./pages/Gamification"
import Monetization from "./pages/Monetization"
import Notifications from "./pages/Notifications"
import Settings from "./pages/Settings"
import AIGenerator from "./pages/AIGenerator"
import SpeakingMonitor from "./pages/SpeakingMonitor"
import VocabForge from "./pages/VocabForge"
import SpeakUpManager from "./pages/SpeakUpManager"
import SessionConfig from "./pages/SessionConfig"
import EbookForge from "./pages/EbookForge"
import VideoDrillManager from "./pages/VideoDrillManager"
import StudentDashboard from "./pages/student/StudentDashboard"
import SessionPlayer from "./pages/student/SessionPlayer"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          <Route path="/courses" element={<Navigate to="/admin/courses" replace />} />

          {/* Root Dispatcher */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dispatcher />
              </ProtectedRoute>
            }
          />

          {/* Protected admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<Courses />} />
            <Route path="vocab-forge" element={<VocabForge />} />
            <Route path="users" element={<Users />} />
            <Route path="scenarios" element={<Scenarios />} />
            <Route path="gamification" element={<Gamification />} />
            <Route path="monetization" element={<Monetization />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="ai-generator" element={<AIGenerator />} />
            <Route path="speaking-monitor" element={<SpeakingMonitor />} />
            <Route path="speakup" element={<SpeakUpManager />} />
            <Route path="session-config" element={<SessionConfig />} />
            <Route path="ebook-forge" element={<EbookForge />} />
            <Route path="video-drills" element={<VideoDrillManager />} />
          </Route>

          {/* Protected student routes */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="learn/:lessonId" element={<SessionPlayer />} />
            {/* Future student routes will go here */}
          </Route>

          <Route
            path="*"
            element={
              <div className="p-12 bg-white rounded-2xl text-center border border-slate-100">
                <h2 className="text-xl font-semibold text-slate-400">Page not found</h2>
                <p className="text-sm text-slate-400 mt-2">The page you're looking for doesn't exist.</p>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function Dispatcher() {
  const { userType } = useAuth()
  if (userType === "admin") return <Navigate to="/admin" replace />
  if (userType === "student") return <Navigate to="/portal" replace />
  return <Navigate to="/login" replace />
}

export default App
