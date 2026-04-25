import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminLayout from "./layouts/AdminLayout"

import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Courses from "./pages/Courses"
import Users from "./pages/Users"
import Scenarios from "./pages/Scenarios"
import Gamification from "./pages/Gamification"
import Monetization from "./pages/Monetization"
import Settings from "./pages/Settings"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected admin routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<Courses />} />
            <Route path="users" element={<Users />} />
            <Route path="scenarios" element={<Scenarios />} />
            <Route path="gamification" element={<Gamification />} />
            <Route path="monetization" element={<Monetization />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="*"
              element={
                <div className="p-12 bg-white rounded-2xl text-center border border-slate-100">
                  <h2 className="text-xl font-semibold text-slate-400">Page not found</h2>
                  <p className="text-sm text-slate-400 mt-2">The page you're looking for doesn't exist.</p>
                </div>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
