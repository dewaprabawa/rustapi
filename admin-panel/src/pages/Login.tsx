import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Lock, Mail, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../lib/utils"

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.")
      return
    }

    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate("/", { replace: true })
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Invalid credentials. Please try again."
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden">
      {/* Subtle Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-50/50 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-50/50 blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-[440px] px-6"
      >
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Log in</h1>
            <p className="text-slate-500 mt-3 text-sm">
              Don't have an account? <a href="#" className="text-blue-600 font-semibold hover:underline">Sign up</a>
            </p>
          </div>

          {/* Social Logins */}
          <div className="space-y-3 mb-8">
            <SocialButton 
              label="Continue with Google" 
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              } 
            />
            <SocialButton 
              label="Continue with Apple" 
              icon={
                <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.96.95-2.04 1.72-3.32 1.72-1.21 0-1.63-.73-3.11-.73-1.47 0-1.95.71-3.11.73-1.28.02-2.38-.82-3.32-1.74-2-1.95-3.53-5.51-3.53-8.85 0-3.3 1.34-5.06 2.62-5.9 1.19-.78 2.27-1.12 3.19-1.12.91 0 1.93.31 2.81.74.88.43 1.25.59 1.55.59.3 0 .61-.13 1.5-.56.88-.43 1.94-.78 2.91-.78 1.25 0 2.59.35 3.51 1.23-2.39 1.4-1.99 4.67.62 5.75-.58 1.44-1.34 2.89-2.5 4.31-.77.94-1.57 1.86-2.52 1.86-.01 0-.01 0 0 0zM12.03 5.07c-.15 0-.3 0-.45-.02.13-2.19 1.94-3.92 4.01-4.05.15 0 .3 0 .46.02-.13 2.21-1.96 3.95-4.02 4.05z"/>
                </svg>
              } 
            />
            <SocialButton 
              label="Continue with Facebook" 
              icon={
                <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.03 4.42 11.02 10.12 11.91v-8.43H7.08v-3.48h3.05V9.41c0-3.01 1.79-4.67 4.54-4.67 1.31 0 2.68.23 2.68.23v2.95h-1.5c-1.49 0-1.96.93-1.96 1.87v2.25h3.32l-.53 3.48h-2.79v8.43C19.58 23.09 24 18.1 24 12.07z"/>
                </svg>
              } 
            />
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">OR</span>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              <button type="button" className="text-blue-600 text-xs font-semibold hover:underline ml-1">
                Use your mobile number
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button type="button" className="text-blue-600 text-xs font-semibold hover:underline ml-1">
                Forgot your password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Log in"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-10 text-slate-400 text-xs font-medium tracking-wide">
          SECURE ENCRYPTION ENABLED • v4.2.0
        </p>
      </motion.div>
    </div>
  )
}

function SocialButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-slate-200 rounded-full bg-white hover:bg-slate-50 transition-colors shadow-sm group">
      {icon}
      <span className="text-slate-700 font-semibold text-sm">{label}</span>
    </button>
  )
}
