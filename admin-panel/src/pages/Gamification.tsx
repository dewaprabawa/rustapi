import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Gamepad2, Trophy, Star, Zap, Save, Loader2, Trash2 } from "lucide-react"
import { getGamificationConfig, updateGamificationConfig, getGames, deleteGame } from "../services/api"
import { cn } from "../lib/utils"

export default function Gamification() {
  const [activeTab, setActiveTab] = useState<"config" | "games">("config")

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["gamification-config"],
    queryFn: getGamificationConfig,
  })

  const { data: gamesData, isLoading: gamesLoading } = useQuery({
    queryKey: ["games"],
    queryFn: getGames,
  })

  const games = gamesData?.data ?? gamesData ?? []

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gamification</h2>
          <p className="text-slate-500 text-sm mt-1">Configure XP rewards, levels, and mini-games.</p>
        </div>
        <div className="flex bg-slate-100/50 p-1 rounded-xl">
          {(["config", "games"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all duration-200",
                activeTab === tab
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab === "config" ? "XP & Levels" : "Mini-Games"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "config" ? (
        <GamificationConfigPanel config={config} isLoading={configLoading} />
      ) : (
        <GamesPanel games={games} isLoading={gamesLoading} />
      )}
    </div>
  )
}

function GamificationConfigPanel({ config, isLoading }: { config: any; isLoading: boolean }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<any>(null)
  const editData = formData ?? config ?? {}

  const mutation = useMutation({
    mutationFn: (data: any) => updateGamificationConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification-config"] })
      setFormData(null)
    },
  })

  const handleChange = (field: string, value: any) => {
    setFormData({ ...editData, [field]: value })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex items-center justify-center border border-slate-100">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <Star className="mr-2 h-5 w-5 text-amber-500" /> XP Settings
          </h3>

          {[
            { label: "XP per Lesson Completion", key: "xp_per_lesson", icon: "📖" },
            { label: "XP per Quiz Pass", key: "xp_per_quiz", icon: "✅" },
            { label: "XP per Game Win", key: "xp_per_game", icon: "🎮" },
            { label: "Daily Login Bonus", key: "daily_login_xp", icon: "📅" },
          ].map((item) => (
            <div key={item.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {item.label}
              </label>
              <input
                type="number"
                value={editData[item.key] ?? ""}
                onChange={(e) => handleChange(item.key, parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all"
              />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-indigo-500" /> Level Thresholds
          </h3>

          {[
            { label: "XP for Level 2", key: "level_2_threshold" },
            { label: "XP for Level 3", key: "level_3_threshold" },
            { label: "XP for Level 4", key: "level_4_threshold" },
            { label: "XP for Level 5", key: "level_5_threshold" },
          ].map((item) => (
            <div key={item.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {item.label}
              </label>
              <input
                type="number"
                value={editData[item.key] ?? ""}
                onChange={(e) => handleChange(item.key, parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {formData && (
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending}
            className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}

function GamesPanel({ games, isLoading }: { games: any[]; isLoading: boolean }) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGame(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["games"] }),
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex items-center justify-center border border-slate-100">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {games.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <Gamepad2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500">No mini-games configured yet</p>
          <p className="text-xs text-slate-400 mt-1">Create games like Word Scramble, Flashcards, or Matching.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {games.map((game: any) => {
            const gid = game._id?.$oid || game._id || game.id
            return (
              <div key={gid} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all group relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-11 w-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(gid)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h4 className="font-semibold text-slate-800">{game.title || game.name || "Untitled"}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{game.description || "No description"}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                    game.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {game.is_active !== false ? "Active" : "Inactive"}
                  </span>
                  {game.xp_reward && (
                    <span className="inline-flex items-center text-xs text-amber-600">
                      <Zap className="h-3 w-3 mr-0.5" /> {game.xp_reward} XP
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
