import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useRef } from "react"
import { Gamepad2, Trophy, Star, Zap, Save, Loader2, Trash2, Pencil, Sparkles, Play, X, RotateCcw, Check, ArrowRight, Volume2 } from "lucide-react"
import { getGamificationConfig, updateGamificationConfig, getGames, createGame, deleteGame, getLessons, uploadAsset, updateGame, aiGenerateContent } from "../services/api"
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

function GamesPanel({ games, isLoading }: { games: any[]; isLoading: boolean }) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGame(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["games"] }),
  })

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [simGame, setSimGame] = useState<any>(null)

  const handleAIGenerate = async () => {
    setIsGeneratingAI(true)
    try {
      const context = `${formData.game_type} game for hospitality English`
      const data = await aiGenerateContent("game", context)
      setFormData((prev: any) => ({
        ...prev,
        title: data.title || prev.title,
        instructions: data.instructions || prev.instructions,
        data_json: data.data_json ? JSON.stringify(data.data_json, null, 2) : prev.data_json
      }))
    } catch (err: any) {
      if (err?.response?.status === 404) {
        alert("No active API key. Go to Settings → API Keys to add one.")
      } else {
        alert("AI generation failed. Check your API key in Settings.")
      }
    } finally {
      setIsGeneratingAI(false)
    }
  }
  const [formData, setFormData] = useState<any>({
    title: "",
    game_type: "SCENE_MATCHER",
    lesson_id: "",
    module_id: "",
    difficulty: "easy",
    xp_reward: 20,
    instructions: "",
    asset_url: "",
    data_json: "{}"
  })

  const { data: lessonsData } = useQuery({ queryKey: ['lessons'], queryFn: getLessons })
  const lessons = lessonsData?.data || lessonsData || []

  const createMutation = useMutation({
    mutationFn: (data: any) => createGame(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] })
      setIsCreateModalOpen(false)
      setFormData({
        title: "", game_type: "SCENE_MATCHER", lesson_id: "", module_id: "", difficulty: "easy", xp_reward: 20, instructions: "", asset_url: "", data_json: "{}"
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateGame(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] })
      setIsCreateModalOpen(false)
      setEditingGameId(null)
      setFormData({
        title: "", game_type: "SCENE_MATCHER", lesson_id: "", module_id: "", difficulty: "easy", xp_reward: 20, instructions: "", asset_url: "", data_json: "{}"
      })
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex items-center justify-center border border-slate-100">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  const handleCreate = () => {
    let parsedData = {}
    try {
      parsedData = JSON.parse(formData.data_json)
    } catch (e) {
      alert("Invalid JSON format in Data JSON")
      return
    }

    const payload = {
      ...formData,
      xp_reward: Number(formData.xp_reward),
      data_json: parsedData
    }

    if (payload.lesson_id?.$oid) payload.lesson_id = payload.lesson_id.$oid
    if (payload.module_id?.$oid) payload.module_id = payload.module_id.$oid
    if (!payload.module_id) delete payload.module_id
    if (!payload.ai_scenario_id) delete payload.ai_scenario_id
    if (!payload.asset_url) delete payload.asset_url

    if (editingGameId) {
      updateMutation.mutate({ id: editingGameId, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const res = await uploadAsset(file)
      setFormData({ ...formData, asset_url: res.url })
    } catch (err) {
      alert("Failed to upload asset")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditingGameId(null)
            setFormData({
              title: "", game_type: "SCENE_MATCHER", lesson_id: "", module_id: "", difficulty: "easy", xp_reward: 20, instructions: "", asset_url: "", data_json: "{}"
            })
            setIsCreateModalOpen(true)
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all shadow-blue-600/20 hover:shadow-blue-600/40"
        >
          <Gamepad2 className="mr-2 h-4 w-4" />
          Create Game
        </button>
      </div>

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
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSimGame(game)}
                      className="p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                      title="Simulate game"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingGameId(gid)
                        setFormData({
                          title: game.title || "",
                          game_type: game.game_type || "SCENE_MATCHER",
                          lesson_id: game.lesson_id?.$oid || game.lesson_id || "",
                          module_id: game.module_id?.$oid || game.module_id || "",
                          difficulty: game.difficulty || "easy",
                          xp_reward: game.xp_reward || 20,
                          instructions: game.instructions || "",
                          asset_url: game.asset_url || "",
                          data_json: JSON.stringify(game.data_json || {}, null, 2)
                        })
                        setIsCreateModalOpen(true)
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(gid)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800">{editingGameId ? "Edit Game" : "Game Builder"}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAIGenerate}
                  disabled={isGeneratingAI}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
                >
                  {isGeneratingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  AI Generate
                </button>
                <button onClick={() => { setIsCreateModalOpen(false); setEditingGameId(null); }} className="text-slate-400 hover:text-slate-600 p-1">×</button>
              </div>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Game Title</label>
                  <input
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Lobby Greeting Matching"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Game Type</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                      value={formData.game_type}
                      onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
                    >
                      <option value="SCENE_MATCHER">Scene Matcher</option>
                      <option value="RESPECT_MASTER">Respect Master</option>
                      <option value="VOICE_STAR">Voice Star</option>
                      <option value="WORD_SCRAMBLE">Word Scramble</option>
                      <option value="MATCHING">Matching</option>
                      <option value="FILL_IN_THE_BLANK">Fill in the Blank</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">XP Reward</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                      value={formData.xp_reward}
                      onChange={(e) => setFormData({ ...formData, xp_reward: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Linked Lesson</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                    value={formData.lesson_id?.$oid || formData.lesson_id}
                    onChange={(e) => setFormData({ ...formData, lesson_id: e.target.value })}
                  >
                    <option value="" disabled>Select Lesson</option>
                    {lessons.map((l: any) => {
                      const lid = l._id?.$oid || l.id
                      return <option key={lid} value={lid}>{l.title}</option>
                    })}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Instructions</label>
                  <textarea
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm min-h-[100px] resize-y"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Game instructions for the player..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between">
                    <span>Asset URL (Background / Audio)</span>
                    {isUploading && <span className="text-blue-500 text-xs flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Uploading...</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm"
                      value={formData.asset_url}
                      onChange={(e) => setFormData({ ...formData, asset_url: e.target.value })}
                      placeholder="https://..."
                    />
                    <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl cursor-pointer transition-colors border border-slate-200 flex items-center justify-center whitespace-nowrap">
                      Upload
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,audio/*"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col min-h-[400px]">
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Data Payload (JSON)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAIGenerate}
                      disabled={isGeneratingAI}
                      className="text-xs text-violet-600 hover:text-violet-700 disabled:text-slate-300 flex items-center gap-1"
                    >
                      {isGeneratingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Fill Data
                    </button>
                    <span className="text-xs text-slate-400 font-mono">
                      {formData.game_type === "SCENE_MATCHER" ? "options: []" : formData.game_type === "VOICE_STAR" ? "script: string" : ""}
                    </span>
                  </div>
                </label>
                <textarea
                  className="w-full flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/30 resize-y min-h-[350px]"
                  value={formData.data_json}
                  onChange={(e) => setFormData({ ...formData, data_json: e.target.value })}
                  placeholder='{ "options": ["A", "B"], "correct": "A" }'
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 flex-shrink-0">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending || !formData.title || !formData.lesson_id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingGameId ? 'Update Game' : 'Create Game'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Game Simulation Modal ========== */}
      {simGame && (
        <GameSimulator game={simGame} onClose={() => setSimGame(null)} />
      )}
    </div>
  )
}

// ========== Game Simulator Component ==========
function GameSimulator({ game, onClose }: { game: any; onClose: () => void }) {
  const data = game.data_json || {}
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [scrambleInput, setScrambleInput] = useState("")
  const [matchedPairs, setMatchedPairs] = useState<number[]>([])
  const [matchLeft, setMatchLeft] = useState<number | null>(null)
  const [simPhase, setSimPhase] = useState<'play' | 'correct' | 'wrong' | 'done'>('play')
  const [xpEarned, setXpEarned] = useState(0)
  // Enhanced game session state
  const [timer, setTimer] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const timerRef = useRef<any>(null)

  // Questions array support
  const questions = Array.isArray(data.questions) ? data.questions : (data.question ? [data] : [data])
  const currentQ = questions[qIndex] || data

  // Start timer on mount
  useState(() => {
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  })

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const reset = () => {
    setSelected(null)
    setAnswered(false)
    setScrambleInput("")
    setMatchedPairs([])
    setMatchLeft(null)
    setSimPhase('play')
    setXpEarned(0)
    setTimer(0)
    setScore(0)
    setStreak(0)
    setQIndex(0)
    setTotalAnswered(0)
    setTotalCorrect(0)
  }

  const checkAnswer = (answer: string, correct: string) => {
    setSelected(answer)
    setAnswered(true)
    setTotalAnswered(t => t + 1)
    const isRight = answer.toLowerCase() === correct.toLowerCase()
    if (isRight) {
      const streakBonus = streak >= 2 ? 5 * streak : 0
      const baseXp = Math.round((game.xp_reward || 20) / Math.max(questions.length, 1))
      setScore(s => s + baseXp + streakBonus)
      setStreak(s => s + 1)
      setTotalCorrect(t => t + 1)
      // Auto-advance for multi-question
      if (questions.length > 1 && qIndex < questions.length - 1) {
        setTimeout(() => {
          setQIndex(q => q + 1)
          setSelected(null)
          setAnswered(false)
        }, 1200)
      } else {
        setXpEarned(score + baseXp + streakBonus)
        setTimeout(() => setSimPhase('correct'), 800)
      }
    } else {
      setStreak(0)
      if (questions.length <= 1) {
        setTimeout(() => setSimPhase('wrong'), 800)
      } else {
        // Allow retry on multi-question after delay
        setTimeout(() => { setSelected(null); setAnswered(false) }, 1500)
      }
    }
  }

  const gameTypeLabel: Record<string, string> = {
    SCENE_MATCHER: "🎬 Scene Matcher",
    WORD_SCRAMBLE: "🔤 Word Scramble",
    MATCHING: "🔗 Matching",
    FILL_IN_THE_BLANK: "📝 Fill in the Blank",
    RESPECT_MASTER: "🎩 Respect Master",
    VOICE_STAR: "🎤 Voice Star",
  }

  const renderGame = () => {
    switch (game.game_type) {
      case "SCENE_MATCHER":
      case "RESPECT_MASTER": {
        const q = currentQ.question || currentQ.scenario || "What would you say?"
        const opts = currentQ.options || []
        const correct = currentQ.correct || opts[0] || ""
        return (
          <div className="space-y-4">
            {data.emoji && <div className="text-4xl text-center mb-2">{data.emoji}</div>}
            <p className="text-slate-200 font-medium text-center text-base">{q}</p>
            <div className="space-y-2">
              {opts.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => !answered && checkAnswer(opt, correct)}
                  disabled={answered}
                  className={cn(
                    "w-full text-left px-5 py-3.5 rounded-xl font-medium text-sm transition-all border",
                    answered && opt.toLowerCase() === correct.toLowerCase()
                      ? "bg-green-500/20 border-green-500/40 text-green-300"
                      : answered && selected === opt
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <span className="mr-3 text-xs font-black text-slate-500">{String.fromCharCode(65 + i)}</span>
                  {opt}
                  {answered && opt.toLowerCase() === correct.toLowerCase() && (
                    <Check className="inline h-4 w-4 ml-2 text-green-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "WORD_SCRAMBLE": {
        const word = (currentQ.word || "HOTEL").toUpperCase()
        const hint = currentQ.hint || "Unscramble the word"
        const shuffled = word.split("").sort(() => Math.random() - 0.5).join("")
        const isCorrect = scrambleInput.toUpperCase() === word
        return (
          <div className="space-y-5 text-center">
            <p className="text-slate-400 text-sm italic">"{hint}"</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {shuffled.split("").map((ch, i) => (
                <div
                  key={i}
                  onClick={() => !answered && setScrambleInput(prev => prev + ch)}
                  className="h-12 w-12 bg-violet-500/20 border border-violet-500/30 rounded-xl flex items-center justify-center text-lg font-black text-violet-300 cursor-pointer hover:bg-violet-500/30 transition-all"
                >
                  {ch}
                </div>
              ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 min-h-[48px]">
              <span className="text-lg font-bold text-white tracking-widest">{scrambleInput || "..."}</span>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setScrambleInput("")} className="px-4 py-2 bg-white/10 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/15 transition-all">
                Clear
              </button>
              <button
                onClick={() => { setAnswered(true); if (isCorrect) { setSimPhase('correct'); setXpEarned(game.xp_reward || 20); } else { setSimPhase('wrong'); } }}
                disabled={!scrambleInput}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
              >
                Check
              </button>
            </div>
          </div>
        )
      }

      case "MATCHING": {
        const pairs: { left: string; right: string }[] = currentQ.pairs || []
        if (pairs.length === 0) return <p className="text-slate-400 text-center">No pairs data</p>
        const allMatched = matchedPairs.length === pairs.length
        if (allMatched && simPhase === 'play') { setSimPhase('correct'); setXpEarned(game.xp_reward || 20); }
        return (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-3">Match the pairs</p>
            {pairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-3">
                <button
                  onClick={() => setMatchLeft(i)}
                  disabled={matchedPairs.includes(i)}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left",
                    matchedPairs.includes(i)
                      ? "bg-green-500/15 border-green-500/30 text-green-400"
                      : matchLeft === i
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  )}
                >
                  {pair.left}
                </button>
                <ArrowRight className="h-4 w-4 text-slate-600 flex-shrink-0" />
                <button
                  onClick={() => {
                    if (matchLeft !== null && matchLeft === i) {
                      setMatchedPairs(prev => [...prev, i])
                      setMatchLeft(null)
                    } else if (matchLeft !== null) {
                      // Wrong match — flash
                      setMatchLeft(null)
                    }
                  }}
                  disabled={matchedPairs.includes(i)}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left",
                    matchedPairs.includes(i)
                      ? "bg-green-500/15 border-green-500/30 text-green-400"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  )}
                >
                  {pair.right}
                </button>
              </div>
            ))}
          </div>
        )
      }

      case "FILL_IN_THE_BLANK": {
        const sentence = currentQ.sentence || "Good afternoon, ____ to the Grand Hotel."
        const opts = currentQ.options || []
        const correct = currentQ.correct || opts[0] || ""
        const parts = sentence.split("____")
        return (
          <div className="space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <p className="text-base font-medium text-slate-200 leading-relaxed">
                {parts[0]}
                <span className={cn(
                  "inline-block px-3 py-1 mx-1 rounded-lg font-bold border-b-2 min-w-[80px]",
                  answered && selected?.toLowerCase() === correct.toLowerCase()
                    ? "text-green-400 border-green-500 bg-green-500/10"
                    : answered
                    ? "text-rose-400 border-rose-500 bg-rose-500/10"
                    : "text-amber-400 border-amber-500/50 bg-amber-500/10"
                )}>
                  {selected || "______"}
                </span>
                {parts[1] || ""}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {opts.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => !answered && checkAnswer(opt, correct)}
                  disabled={answered}
                  className={cn(
                    "px-4 py-3 rounded-xl font-medium text-sm border transition-all",
                    answered && opt.toLowerCase() === correct.toLowerCase()
                      ? "bg-green-500/20 border-green-500/40 text-green-300"
                      : answered && selected === opt
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "VOICE_STAR": {
        const script = currentQ.script || "Good morning, welcome to the Grand Hotel!"
        return (
          <div className="space-y-5 text-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-lg font-medium text-slate-200 italic leading-relaxed">"{script}"</p>
            </div>
            <p className="text-xs text-slate-500">Read the sentence aloud</p>
            {simPhase === 'play' ? (
              <button
                onClick={() => {
                  setSimPhase('done')
                  setTimeout(() => {
                    setSimPhase('correct')
                    setXpEarned(game.xp_reward || 20)
                  }, 3000)
                }}
                className="mx-auto h-20 w-20 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
              >
                <Volume2 className="h-8 w-8 text-white" />
              </button>
            ) : simPhase === 'done' ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-20 w-20 rounded-full bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center animate-pulse">
                  <Volume2 className="h-8 w-8 text-rose-400" />
                </div>
                <span className="text-rose-300 text-sm font-bold">Listening...</span>
              </div>
            ) : null}
          </div>
        )
      }

      default:
        return <p className="text-slate-400 text-center text-sm">No simulator available for this game type.<br/>Data: <code className="text-xs">{JSON.stringify(data).slice(0, 200)}</code></p>
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white">
        {/* Header HUD */}
        <div className="p-6 pb-3 flex justify-between items-start">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1 flex items-center gap-2">
              📱 Live Preview {timer > 0 && <span className="text-slate-400 font-mono font-medium">{formatTime(timer)}</span>}
            </p>
            <h3 className="text-lg font-bold truncate max-w-[280px]">{game.title || "Untitled Game"}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">{gameTypeLabel[game.game_type] || game.game_type}</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" />
                Score: {score}
              </span>
              {streak > 1 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    🔥 {streak} Streak
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Multi-question progress bar */}
        {questions.length > 1 && simPhase === 'play' && (
          <div className="px-6 mb-4">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${((qIndex) / questions.length) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 text-right mt-1 font-medium">
              Question {qIndex + 1} of {questions.length}
            </p>
          </div>
        )}

        {/* Instructions */}
        {game.instructions && simPhase === 'play' && (
          <div className="px-6 pb-3">
            <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">{game.instructions}</p>
          </div>
        )}

        {/* Game area */}
        <div className="px-6 pb-6">
          {(simPhase === 'correct' || simPhase === 'wrong') ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in duration-300">
              <div className={cn(
                "h-20 w-20 rounded-full mx-auto flex items-center justify-center",
                simPhase === 'correct' ? "bg-green-500/20 border-2 border-green-500/40" : "bg-rose-500/20 border-2 border-rose-500/40"
              )}>
                {simPhase === 'correct'
                  ? <Check className="h-10 w-10 text-green-400" />
                  : <X className="h-10 w-10 text-rose-400" />
                }
              </div>
              <p className={cn("text-xl font-black", simPhase === 'correct' ? "text-green-400" : "text-rose-400")}>
                {simPhase === 'correct' ? "Correct! 🎉" : "Not quite! 😅"}
              </p>
              {xpEarned > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/15 border border-amber-500/25 rounded-xl">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-300 font-bold text-sm">+{xpEarned} XP</span>
                </div>
              )}
              <button
                onClick={reset}
                className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-white/10 mt-2"
              >
                <RotateCcw className="h-4 w-4" /> Play Again
              </button>
            </div>
          ) : (
            renderGame()
          )}
        </div>
      </div>
    </div>
  )
}
