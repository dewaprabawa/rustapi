import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Trophy, Loader2, Save } from 'lucide-react'
import { updateGamificationConfig } from '../../services/api'

interface GamificationConfigPanelProps {
  config: any
  isLoading: boolean
}

export const GamificationConfigPanel: React.FC<GamificationConfigPanelProps> = ({ config, isLoading }) => {
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
            { label: "Max Streak Freezes", key: "max_streak_freezes", icon: "❄️" },
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
