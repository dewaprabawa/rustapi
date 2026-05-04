import { useQuery } from "@tanstack/react-query"
import { Users, BookOpen, BrainCircuit, Activity, Sparkles, MessageSquare, Plus, ArrowUpRight, UserPlus, Zap } from "lucide-react"
import { getDashboardStats, getUsers } from "../services/api"
import { Link } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { normalizeDate } from "../lib/utils"

interface DashboardUser {
  _id: any
  name?: string
  email: string
  profile_image_url?: string
  created_at?: string
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000, // Refresh every 30s
  })

  const { data: recentUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['recent-users'],
    queryFn: () => getUsers(1, 5),
  })

  const safeFormatDate = (dateVal: any) => {
    const d = normalizeDate(dateVal);
    return d ? formatDistanceToNow(d, { addSuffix: true }) : "Recently";
  }

  const statCards = [
    { 
      name: "Total Users", 
      value: stats?.total_users ?? "0", 
      change: stats?.active_users_today ? `+${stats.active_users_today} today` : "No activity",
      trend: "up", 
      icon: Users,
      color: "blue"
    },
    { 
      name: "Learning Content", 
      value: stats?.total_courses ?? "0", 
      change: `${stats?.total_vocab_sets ?? 0} vocab sets`, 
      trend: "up", 
      icon: BookOpen,
      color: "indigo"
    },
    { 
      name: "AI Scenarios", 
      value: stats?.total_scenarios ?? "0", 
      change: "Interactive practice", 
      trend: "up", 
      icon: BrainCircuit,
      color: "purple"
    },
    { 
      name: "Speaking Sessions", 
      value: stats?.total_speaking_sessions ?? "0", 
      change: "Real-time tests", 
      trend: "up", 
      icon: Activity,
      color: "emerald"
    },
  ]

  const shortcuts = [
    { name: "VocabForge AI", description: "Generate new vocab sets", icon: Sparkles, path: "/vocab-forge", color: "bg-amber-50 text-amber-600 border-amber-100" },
    { name: "Speaking Practice", description: "Manage AI roleplay", icon: MessageSquare, path: "/scenarios", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
    { name: "Course Builder", description: "Curate learning paths", icon: Plus, path: "/courses", color: "bg-blue-50 text-blue-600 border-blue-100" },
    { name: "Live Monitor", description: "View student sessions", icon: Activity, path: "/speaking-monitor", color: "bg-rose-50 text-rose-600 border-rose-100" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's what's happening with your platform today.</p>
        </div>
        <div className="hidden md:flex gap-3">
          <Link to="/ai-generator" className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all shadow-lg shadow-slate-200">
            <Zap className="h-4 w-4 mr-2 text-amber-400 fill-amber-400" />
            AI Generator
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group relative overflow-hidden">
            <div className={`absolute right-0 top-0 h-24 w-24 bg-gradient-to-br from-${stat.color}-50 to-transparent rounded-bl-full opacity-60 group-hover:scale-125 transition-transform duration-500`} />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`h-12 w-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                <stat.icon className="h-6 w-6" />
              </div>
              {statsLoading ? (
                <div className="h-5 w-12 bg-slate-100 animate-pulse rounded-full" />
              ) : (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {stat.change}
                </span>
              )}
            </div>

            <div className="relative z-10">
              <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.name}</h3>
              {statsLoading ? (
                <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg mt-2" />
              ) : (
                <p className="text-3xl font-black text-slate-800 mt-1">{stat.value.toLocaleString()}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Quick Actions / Shortcuts */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-amber-500 fill-amber-500" />
              Quick Shortcuts
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shortcuts.map((item) => (
              <Link 
                key={item.name} 
                to={item.path}
                className={`group p-5 rounded-3xl border ${item.color} hover:shadow-lg transition-all duration-300 flex items-center gap-4`}
              >
                <div className="h-12 w-12 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{item.name}</h3>
                  <p className="text-xs opacity-70 font-medium">{item.description}</p>
                </div>
                <ArrowUpRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>

          {/* Recent Registrations Table/List */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-800">Recent Users</h2>
              <Link to="/users" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center">
                View All <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            {usersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {recentUsers?.data?.map((user: DashboardUser) => (
                  <div key={user._id?.$oid || user._id} className="flex items-center p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 cursor-pointer group">
                    <div className="h-12 w-12 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 mr-4 group-hover:scale-110 transition-transform">
                      {user.profile_image_url ? (
                        <img src={user.profile_image_url} alt={user.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <Users className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{user.name || "Anonymous User"}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Joined</p>
                      <p className="text-xs font-bold text-slate-600 whitespace-nowrap">
                        {safeFormatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {(!recentUsers?.data || recentUsers.data.length === 0) && (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-medium">No users registered yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200">
            <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
              <Sparkles className="h-8 w-8 text-white fill-white" />
            </div>
            <h3 className="text-2xl font-black mb-3 leading-tight">Create Smarter Content with AI</h3>
            <p className="text-indigo-100 text-sm leading-relaxed mb-8 opacity-90">
              Use our built-in AI tools to generate vocabulary sets, roleplay scenarios, and even full course structures in seconds.
            </p>
            <Link to="/vocab-forge" className="inline-flex items-center justify-center w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold shadow-lg hover:bg-indigo-50 transition-all">
              Launch VocabForge
            </Link>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-emerald-500" />
              Platform Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-xs font-bold text-emerald-700">API Gateway</span>
                <div className="flex items-center text-[10px] font-black text-emerald-600">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  OPERATIONAL
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-xs font-bold text-emerald-700">AI Services</span>
                <div className="flex items-center text-[10px] font-black text-emerald-600">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  OPERATIONAL
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-xs font-bold text-emerald-700">Voice Synthesis</span>
                <div className="flex items-center text-[10px] font-black text-emerald-600">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  OPERATIONAL
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-100">
              <button className="w-full flex items-center justify-center py-4 bg-slate-50 text-slate-500 rounded-2xl text-xs font-bold hover:bg-slate-100 transition-colors">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Team Member
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
