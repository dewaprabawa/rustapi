import { Outlet, Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Flame, 
  Trophy,
  User as UserIcon,
  Bell
} from "lucide-react"
import { cn } from "../lib/utils"

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Learning", path: "/learn", icon: BookOpen },
    { label: "Vocab Master", path: "/vocab", icon: MessageSquare },
    { label: "Settings", path: "/settings", icon: Settings },
  ]

  // Mock stats for demo
  const stats = {
    streak: 5,
    xp: 1250,
    level: 12
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg italic">E</span>
              </div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">EduCraft</span>
            </div>

            {/* Stats - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-sm font-bold text-orange-700">{stats.streak}d</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                <Trophy className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-blue-700">{stats.xp} XP</span>
              </div>
            </div>

            {/* Profile & Actions */}
            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              
              <div className="h-8 w-px bg-slate-200" />
              
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || "Student"}</p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">Level {stats.level}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                  {user?.profile_image_url ? (
                    <img src={user.profile_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Stats Bar */}
      <div className="md:hidden bg-white border-b border-slate-100 px-4 py-2 flex justify-around">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-slate-700">{stats.streak} Streak</span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold text-slate-700">{stats.xp} XP</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Navigation Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all",
                  location.pathname === item.path
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl font-semibold text-rose-500 hover:bg-rose-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1",
              location.pathname === item.path ? "text-blue-600" : "text-slate-400"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
