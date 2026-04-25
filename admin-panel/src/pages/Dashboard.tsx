import { Users, BookOpen, BrainCircuit, Activity } from "lucide-react"

export default function Dashboard() {
  const stats = [
    { name: "Total Users", value: "2,543", change: "+12.5%", trend: "up", icon: Users },
    { name: "Active Courses", value: "14", change: "+2", trend: "up", icon: BookOpen },
    { name: "AI Scenarios", value: "48", change: "+5", trend: "up", icon: BrainCircuit },
    { name: "Daily Active", value: "892", change: "-2.4%", trend: "down", icon: Activity },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <stat.icon className="h-6 w-6" />
              </div>
              <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.change}
              </span>
            </div>
            <div className="relative z-10">
              <h3 className="text-slate-500 text-sm font-medium">{stat.name}</h3>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mr-4">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">New user registered</p>
                  <p className="text-xs text-slate-500">john.doe@example.com joined the platform</p>
                </div>
                <span className="text-xs text-slate-400 font-medium">2m ago</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium text-sm transition-colors flex items-center justify-center">
              <BookOpen className="mr-2 h-4 w-4" /> Create Course
            </button>
            <button className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium text-sm transition-colors flex items-center justify-center">
              <BrainCircuit className="mr-2 h-4 w-4" /> New AI Scenario
            </button>
            <button className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-medium text-sm transition-colors flex items-center justify-center">
              <Users className="mr-2 h-4 w-4" /> Invite Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
