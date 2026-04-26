import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, BookOpen, Users, BrainCircuit, Settings, LogOut, Trophy, CreditCard, Bell } from "lucide-react"
import { cn } from "../lib/utils"
import { useAuth } from "../contexts/AuthContext"

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { admin, logout } = useAuth()

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Courses & Content", path: "/courses", icon: BookOpen },
    { name: "Users", path: "/users", icon: Users },
    { name: "AI Scenarios", path: "/scenarios", icon: BrainCircuit },
    { name: "Gamification", path: "/gamification", icon: Trophy },
    { name: "Monetization", path: "/monetization", icon: CreditCard },
    { name: "Notifications", path: "/notifications", icon: Bell },
    { name: "Settings", path: "/settings", icon: Settings },
  ]

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  const adminInitial = admin?.name?.[0] || admin?.email?.[0]?.toUpperCase() || "A"

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Glassmorphic design */}
      <aside className="w-64 fixed inset-y-0 left-0 bg-white/70 backdrop-blur-xl border-r border-slate-200/50 flex flex-col z-10 shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-slate-200/50">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl mr-3 shadow-sm shadow-blue-600/20">
            H
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">Hospitality Eng</span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Admin info + logout */}
        <div className="p-4 border-t border-slate-200/50 space-y-2">
          {admin && (
            <div className="px-3 py-2">
              <p className="text-xs text-slate-500 truncate">{admin.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group"
          >
            <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-slate-400 group-hover:text-red-500 transition-colors" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen relative">
        <header className="h-16 flex items-center justify-between px-8 bg-white/40 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20">
          <h1 className="text-xl font-semibold text-slate-800 capitalize">
            {location.pathname === '/' ? 'Dashboard' : location.pathname.split('/')[1].replace('-', ' ')}
          </h1>
          <div className="flex items-center space-x-3">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors relative">
              <Bell className="h-5 w-5" />
            </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/50 flex items-center justify-center text-blue-700 font-bold text-sm shadow-sm">
              {adminInitial}
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
