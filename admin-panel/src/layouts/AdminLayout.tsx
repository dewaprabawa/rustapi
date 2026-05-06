import { useState, useEffect } from "react"
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BrainCircuit, 
  Settings, 
  LogOut, 
  Trophy, 
  CreditCard, 
  Bell, 
  Sparkles, 
  Mic, 
  Activity,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react"
import { cn, normalizeDate } from "../lib/utils"
import { useAuth } from "../contexts/AuthContext"
import NotificationPopover from "../components/NotificationPopover"

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { admin, logout } = useAuth()

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Courses & Content", path: "/courses", icon: BookOpen },
    { name: "VocabForge AI", path: "/vocab-forge", icon: Sparkles },
    { name: "AI Generator", path: "/ai-generator", icon: Sparkles },
    { name: "Users", path: "/users", icon: Users },
    { name: "AI Scenarios", path: "/scenarios", icon: BrainCircuit },
    { name: "Voice & Speech", path: "/voice-config", icon: Mic },
    { name: "Speaking Monitor", path: "/speaking-monitor", icon: Activity },
    { name: "SpeakUp Fluency", path: "/speakup", icon: Mic },
    { name: "Gamification", path: "/gamification", icon: Trophy },
    { name: "Monetization", path: "/monetization", icon: CreditCard },
    { name: "Notifications", path: "/notifications", icon: Bell },
    { name: "Settings", path: "/settings", icon: Settings },
  ]

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  const toggleSidebar = () => setIsCollapsed(prev => !prev)

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  const adminInitial = admin?.name?.[0] || admin?.email?.[0]?.toUpperCase() || "A"

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Glassmorphic design */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 bg-white/70 backdrop-blur-xl border-r border-slate-200/50 flex flex-col z-30 shadow-sm transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn(
          "h-16 flex items-center border-b border-slate-200/50 transition-all duration-300",
          isCollapsed ? "justify-center px-0" : "px-6"
        )}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-blue-600/20">
            H
          </div>
          {!isCollapsed && (
            <span className="ml-3 font-bold text-lg text-slate-800 tracking-tight truncate opacity-100 transition-opacity duration-300">
              Hospitality Eng
            </span>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.name}
                to={item.path}
                title={isCollapsed ? item.name : ""}
                className={cn(
                  "flex items-center text-sm font-medium rounded-xl transition-all duration-200 group relative",
                  isCollapsed ? "px-0 justify-center h-11 w-11 mx-auto" : "px-3 py-2.5",
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon
                  className={cn(
                    "flex-shrink-0 h-5 w-5 transition-colors",
                    !isCollapsed && "mr-3",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {!isCollapsed && (
                  <span className="truncate opacity-100 transition-opacity duration-300">
                    {item.name}
                  </span>
                )}
                {isCollapsed && isActive && (
                  <div className="absolute left-0 top-1 bottom-1 w-1 bg-blue-600 rounded-r-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Admin info + logout */}
        <div className={cn(
          "p-4 border-t border-slate-200/50 space-y-2 transition-all duration-300",
          isCollapsed ? "items-center" : ""
        )}>
          {admin && !isCollapsed && (
            <div className="px-3 py-2">
              <p className="text-xs text-slate-500 truncate">{admin.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Log Out" : ""}
            className={cn(
              "flex items-center text-sm font-medium text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group",
              isCollapsed ? "px-0 justify-center h-11 w-11 mx-auto" : "w-full px-3 py-2.5"
            )}
          >
            <LogOut className={cn(
              "flex-shrink-0 h-5 w-5 text-slate-400 group-hover:text-red-500 transition-colors",
              !isCollapsed && "mr-3"
            )} />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col min-h-screen relative transition-all duration-300 ease-in-out",
        isCollapsed ? "ml-20" : "ml-64"
      )}>
        <header className="h-16 flex items-center justify-between px-8 bg-white/40 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="p-2 mr-4 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
            <h1 className="text-xl font-semibold text-slate-800 capitalize">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.split('/')[1].replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <NotificationPopover />
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/50 flex items-center justify-center text-blue-700 font-bold text-sm shadow-sm overflow-hidden">
              {admin?.profile_image_url ? (
                <img 
                  src={`${admin.profile_image_url}${admin.profile_image_url.includes('?') ? '&' : '?'}t=${normalizeDate(admin.updated_at)?.getTime() || Date.now()}`} 
                  alt="" 
                  className="h-full w-full object-cover" 
                />
              ) : (
                adminInitial
              )}
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
