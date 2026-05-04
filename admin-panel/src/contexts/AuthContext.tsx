import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { api } from "../services/api"

interface AdminUser {
  _id?: { $oid: string }
  email: string
  name?: string
  profile_image_url?: string
  role?: string
  is_active?: boolean
  updated_at?: any
}

interface AuthContextType {
  admin: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setAdmin: (admin: AdminUser | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("admin_token"))
  const [isLoading, setIsLoading] = useState(true)

  // Verify token on mount by calling /admin/me
  useEffect(() => {
    const verifyToken = async () => {
      const stored = localStorage.getItem("admin_token")
      if (!stored) {
        setIsLoading(false)
        return
      }
      try {
        const res = await api.get("/me")
        setAdmin(res.data)
        setToken(stored)
      } catch {
        // Token is invalid or expired
        localStorage.removeItem("admin_token")
        setToken(null)
        setAdmin(null)
      } finally {
        setIsLoading(false)
      }
    }
    verifyToken()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/login", { email, password })
    const { token: newToken, admin: adminData } = res.data
    localStorage.setItem("admin_token", newToken)
    setToken(newToken)
    setAdmin(adminData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("admin_token")
    setToken(null)
    setAdmin(null)
  }, [])

  return (
    <AuthContext.Provider value={{ admin, token, isAuthenticated: !!token, isLoading, login, logout, setAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
