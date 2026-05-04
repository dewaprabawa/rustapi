import { X, Shield, Mail, Calendar, Zap, Target, Award, Clock } from "lucide-react"
import { normalizeDate } from "../../lib/utils"

interface UserDetailModalProps {
  user: any
  onClose: () => void
}

export default function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  if (!user) return null

  const stats = [
    { label: "Level", value: user.level ?? user.persona?.level ?? 1, icon: Shield, color: "text-indigo-600 bg-indigo-50" },
    { label: "XP", value: user.xp ?? user.progress?.total_practice ?? 0, icon: Zap, color: "text-amber-600 bg-amber-50" },
    { label: "Streak", value: `${user.progress?.streak_days ?? 0} days`, icon: Clock, color: "text-emerald-600 bg-emerald-50" },
    { label: "Practice", value: `${user.progress?.total_practice ?? 0} sessions`, icon: Target, color: "text-blue-600 bg-blue-50" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-indigo-600 to-blue-600">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors backdrop-blur-md"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="absolute -bottom-12 left-8 flex items-end">
            <div className="h-24 w-24 rounded-3xl bg-white p-1.5 shadow-xl">
              <div className="h-full w-full rounded-[1.25rem] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 font-bold text-3xl overflow-hidden">
                {user.profile_image_url ? (
                  <img src={user.profile_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (user.name || user.email || "U")[0].toUpperCase()
                )}
              </div>
            </div>
            <div className="ml-5 mb-2">
              <h3 className="text-2xl font-bold text-white drop-shadow-md">{user.name || "Anonymous User"}</h3>
              <div className="flex items-center text-indigo-100 text-sm font-medium">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                {user.email}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50">
                <div className={`h-10 w-10 rounded-2xl ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-black text-slate-800">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Persona Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-widest">
                <Award className="h-4 w-4 mr-2 text-indigo-500" />
                Learning Persona
              </h4>
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Tone Preference</span>
                  <span className="text-xs font-bold text-slate-700 capitalize">{user.persona?.tone || "Friendly"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Current Goal</span>
                  <span className="text-xs font-bold text-slate-700">{user.persona?.goal || "General Learning"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Main Weakness</span>
                  <span className="text-xs font-bold text-slate-700">{user.persona?.weakness || "None recorded"}</span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center uppercase tracking-widest">
                <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                Account Status
              </h4>
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Joined On</span>
                  <span className="text-xs font-bold text-slate-700">
                    {normalizeDate(user.created_at)?.toLocaleDateString() || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Last Activity</span>
                  <span className="text-xs font-bold text-slate-700">
                    {normalizeDate(user.last_login)?.toLocaleDateString() || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Verified</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${user.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {user.is_verified ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-200"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
