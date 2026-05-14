import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { api, rootApi } from "../services/api"

interface BaseUser {
  _id?: { $oid: string } | string
  email: string
  name?: string
  profile_image_url?: string
}

interface AdminUser extends BaseUser {
  role?: "admin" | "superadmin"
  is_active?: boolean
}

interface StudentUser extends BaseUser {
  persona?: any
  progress?: any
  level?: number
  xp?: number
}

type UserType = "admin" | "student"

interface AuthContextType {
  user: AdminUser | StudentUser | null
  userType: UserType | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: AdminUser | StudentUser | null, type: UserType | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AdminUser | StudentUser | null>(null)
  const [userType, setUserType] = useState<UserType | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"))
  const [isLoading, setIsLoading] = useState(true)

  const setUser = useCallback((newUser: AdminUser | StudentUser | null, type: UserType | null) => {
    setUserState(newUser)
    setUserType(type)
  }, [])

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem("auth_token")
      const storedType = localStorage.getItem("user_type") as UserType
      
      if (!storedToken || !storedType) {
        setIsLoading(false)
        return
      }

      try {
        // First try admin verification if it was an admin
        if (storedType === "admin") {
          const res = await api.get("/me")
          setUser(res.data, "admin")
        } else {
          // Otherwise try student verification
          const res = await rootApi.get("/auth/me")
          setUser(res.data, "student")
        }
        setToken(storedToken)
      } catch (err) {
        console.error("Session verification failed", err)
        localStorage.removeItem("auth_token")
        localStorage.removeItem("user_type")
        setToken(null)
        setUser(null, null)
      } finally {
        setIsLoading(false)
      }
    }
    verifyToken()
  }, [setUser])

  const login = useCallback(async (email: string, password: string) => {
    try {
      // 1. Try Admin Login first
      try {
        const res = await api.post("/login", { email, password })
        const { token: newToken, admin: adminData } = res.data
        localStorage.setItem("auth_token", newToken)
        localStorage.setItem("user_type", "admin")
        setToken(newToken)
        setUser(adminData, "admin")
        return
      } catch (adminErr: any) {
        // If it's not a 401/404, or if we want to proceed to student login
        if (adminErr.response?.status !== 401 && adminErr.response?.status !== 404) {
          throw adminErr
        }
      }

      // 2. Try Student Login
      const res = await rootApi.post("/auth/login", { email, password })
      const { token: newToken, user: userData } = res.data
      localStorage.setItem("auth_token", newToken)
      localStorage.setItem("user_type", "student")
      setToken(newToken)
      setUser(userData, "student")
    } catch (err) {
      throw err
    }
  }, [setUser])

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_type")
    setToken(null)
    setUser(null, null)
  }, [setUser])

  return (
    <AuthContext.Provider value={{ user, userType, token, isAuthenticated: !!token, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
