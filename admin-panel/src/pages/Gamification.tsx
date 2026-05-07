import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useRef } from "react"
import { Gamepad2, Trophy, Star, Zap, Save, Loader2, Trash2, Pencil, Sparkles, Play, X, RotateCcw, Check, ArrowRight, Volume2, Mic } from "lucide-react"
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
                      <option value="PHRASE_BUILDER">Phrase Builder (Tiles)</option>
                      <option value="LISTENING">Listening Challenge</option>
                      <option value="PRONUNCIATION">Pronunciation Game</option>
                      <option value="STORY_MODE">Story Mode</option>
                      <option value="WORD_SEARCH">Word Search</option>
                      <option value="CROSSWORD">Crossword</option>
                      <option value="HANGMAN">Hangman</option>
                      <option value="TRUE_FALSE">True or False</option>
                      <option value="WORD_ASSOCIATION">Word Association</option>
                      <option value="CATEGORIZATION">Categorization</option>
                      <option value="SYNONYM_ANTONYM">Synonym / Antonym</option>
                      <option value="DIALOGUE_SIM">Dialogue Simulation</option>
                      <option value="EMOJI_TO_WORD">Emoji to Word</option>
                      <option value="WORD_CHAIN">Word Chain</option>
                      <option value="PICTURE_DESCRIPTION">Picture Description</option>
                      <option value="ERROR_CORRECTION">Error Correction</option>
                      <option value="RAPID_FIRE">Rapid Fire</option>
                      <option value="IDIOM_GUESSING">Idiom Guessing</option>
                      <option value="RHYME_GAME">Rhyme Game</option>
                      <option value="VOCABULARY_RPG">Vocabulary RPG</option>
                      <option value="DEBATE_MODE">Debate Mode</option>
                      <option value="SHADOW_READING">Shadow Reading</option>
                      <option value="WORD_SNAP">Word Snap</option>
                      <option value="TONGUE_TWISTER">Tongue Twister</option>
                      <option value="NEWS_HEADLINE">News Headline</option>
                      <option value="SONG_LYRICS">Song Lyrics</option>
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
  const [builtPhrase, setBuiltPhrase] = useState<string[]>([])
  const [storyStep, setStoryStep] = useState(0)
  const [foundWords, setFoundWords] = useState<string[]>([])
  const [crosswordGrid, setCrosswordGrid] = useState<Record<string, string>>({})
  const [guessedLetters, setGuessedLetters] = useState<string[]>([])
  const [incorrectGuesses, setIncorrectGuesses] = useState(0)
  const [catItems, setCatItems] = useState<Record<string, string[]>>({})
  const [chainInput, setChainInput] = useState("")
  const [snapMatch, setSnapMatch] = useState<boolean | null>(null)
  const [rpgHealth, setRpgHealth] = useState({ player: 100, monster: 100 })
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
    setBuiltPhrase([])
    setStoryStep(0)
    setFoundWords([])
    setCrosswordGrid({})
    setGuessedLetters([])
    setIncorrectGuesses(0)
    setCatItems({})
    setChainInput("")
    setSnapMatch(null)
    setRpgHealth({ player: 100, monster: 100 })
  }

  const checkAnswer = (answer: string, correct: string) => {
    setSelected(answer)
    setAnswered(true)
    const isRight = answer.toLowerCase() === correct.toLowerCase()
    if (isRight) {
      const streakBonus = streak >= 2 ? 5 * streak : 0
      const baseXp = Math.round((game.xp_reward || 20) / Math.max(questions.length, 1))
      setScore(s => s + baseXp + streakBonus)
      setStreak(s => s + 1)
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
    PHRASE_BUILDER: "🧩 Phrase Builder",
    LISTENING: "👂 Listening Challenge",
    PRONUNCIATION: "🗣️ Pronunciation",
    STORY_MODE: "📖 Story Mode",
    WORD_SEARCH: "🔍 Word Search",
    CROSSWORD: "📝 Crossword",
    HANGMAN: "😵 Hangman",
    TRUE_FALSE: "✅ True or False",
    WORD_ASSOCIATION: "🧠 Word Association",
    CATEGORIZATION: "📁 Categorization",
    SYNONYM_ANTONYM: "⚖️ Synonym / Antonym",
    DIALOGUE_SIM: "💬 Dialogue Simulation",
    EMOJI_TO_WORD: "🧩 Emoji to Word",
    WORD_CHAIN: "🔗 Word Chain",
    PICTURE_DESCRIPTION: "🖼️ Picture Description",
    ERROR_CORRECTION: "🛠️ Error Correction",
    RAPID_FIRE: "🔥 Rapid Fire",
    IDIOM_GUESSING: "🎭 Idiom Guessing",
    RHYME_GAME: "🎵 Rhyme Game",
    VOCABULARY_RPG: "⚔️ Vocabulary RPG",
    DEBATE_MODE: "🗣️ Debate Mode",
    SHADOW_READING: "👥 Shadow Reading",
    WORD_SNAP: "⚡ Word Snap",
    TONGUE_TWISTER: "👅 Tongue Twister",
    NEWS_HEADLINE: "📰 News Headline",
    SONG_LYRICS: "🎶 Song Lyrics",
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
              {shuffled.split("").map((ch: string, i: number) => (
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
            ) : (
              <div className="flex flex-col items-center gap-2 animate-pulse">
                <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Analyzing voice...</p>
              </div>
            )}
          </div>
        )
      }

      case "PHRASE_BUILDER": {
        const sentence = currentQ.sentence || "I would like to check in"
        const tiles = currentQ.tiles || sentence.split(" ").sort(() => Math.random() - 0.5)
        const isCorrect = builtPhrase.join(" ") === sentence
        return (
          <div className="space-y-6">
            <p className="text-slate-400 text-sm text-center italic">Arrange the tiles to form the sentence</p>
            <div className="min-h-[100px] p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-wrap gap-2 justify-center content-center relative">
              {builtPhrase.map((tile, i) => (
                <button
                  key={i}
                  onClick={() => !answered && setBuiltPhrase(prev => prev.filter((_, idx) => idx !== i))}
                  className="px-3 py-2 bg-blue-500/20 border border-blue-500/40 rounded-xl text-sm font-bold text-blue-300 animate-in zoom-in-50 duration-200"
                >
                  {tile}
                </button>
              ))}
              {builtPhrase.length === 0 && <span className="text-slate-600 text-xs italic">Tap tiles below...</span>}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {tiles.map((tile, i) => {
                // Handle multiple same tiles correctly
                const countInBuilt = builtPhrase.filter(t => t === tile).length
                const countInTiles = tiles.filter(t => t === tile).length
                const isUsed = countInBuilt >= countInTiles
                return (
                  <button
                    key={i}
                    disabled={answered || isUsed}
                    onClick={() => setBuiltPhrase(prev => [...prev, tile])}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
                      isUsed 
                        ? "opacity-10 bg-slate-800 border-slate-700 text-slate-500"
                        : "bg-white/10 border-white/10 text-white hover:bg-white/20 active:scale-95"
                    )}
                  >
                    {tile}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-center gap-4">
               <button onClick={() => setBuiltPhrase([])} className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest">Reset</button>
               <button 
                 onClick={() => {
                   setAnswered(true)
                   if (isCorrect) { setSimPhase('correct'); setXpEarned(game.xp_reward || 20); }
                   else { setSimPhase('wrong') }
                 }}
                 disabled={builtPhrase.length === 0}
                 className="px-10 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all"
               >
                 Submit
               </button>
            </div>
          </div>
        )
      }

      case "LISTENING": {
        const q = currentQ.question || "What did you hear?"
        const opts = currentQ.options || []
        const correct = currentQ.correct || opts[0] || ""
        return (
          <div className="space-y-6 text-center">
            <button 
              className="h-24 w-24 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center mx-auto shadow-xl shadow-blue-600/20 active:scale-95 transition-all group"
              onClick={() => {/* Mock play audio */}}
            >
              <Volume2 className="h-10 w-10 text-white group-hover:scale-110 transition-transform" />
            </button>
            <p className="text-slate-200 font-bold text-lg">{q}</p>
            <div className="grid grid-cols-1 gap-3">
              {opts.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => !answered && checkAnswer(opt, correct)}
                  disabled={answered}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all border",
                    answered && opt.toLowerCase() === correct.toLowerCase()
                      ? "bg-green-500/20 border-green-500/40 text-green-300"
                      : answered && selected === opt
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <span className="mr-3 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400 font-black">{i + 1}</span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "STORY_MODE": {
        const steps = data.steps || [
          { text: "You are at the front desk. A guest arrives looking upset.", choices: [{ text: "Greet them warmly", next: 1 }, { text: "Ask what's wrong", next: 2 }] }
        ]
        const step = steps[storyStep] || steps[0]
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/30" />
              <p className="text-lg font-medium text-slate-200 leading-relaxed italic">"{step.text}"</p>
            </div>
            <div className="space-y-3">
              {step.choices?.map((choice: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    if (choice.is_correct === false) {
                      setSimPhase('wrong')
                    } else if (choice.next !== undefined) {
                      setStoryStep(choice.next)
                    } else {
                      setSimPhase('correct')
                      setXpEarned(game.xp_reward || 20)
                    }
                  }}
                  className="w-full text-left px-6 py-4 rounded-2xl font-bold text-sm bg-white/5 border border-white/10 text-slate-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-all group"
                >
                  <span className="mr-4 text-xs text-slate-500 group-hover:text-blue-200">{i + 1}.</span>
                  {choice.text}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "WORD_SEARCH": {
        const words = data.words || ["HOTEL", "LOBBY", "ROOM"]
        return (
          <div className="space-y-6">
            <p className="text-slate-400 text-xs text-center uppercase tracking-widest font-black">Find {words.length} hidden words</p>
            <div className="grid grid-cols-6 gap-1 bg-white/5 p-4 rounded-2xl border border-white/10">
              {Array.from({ length: 36 }).map((_, i) => (
                <div key={i} className="aspect-square flex items-center justify-center text-xs font-black text-slate-500 border border-white/5 rounded-lg">
                  {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {words.map((word: string) => (
                <button
                  key={word}
                  onClick={() => {
                    if (!foundWords.includes(word)) {
                      const newFound = [...foundWords, word]
                      setFoundWords(newFound)
                      if (newFound.length === words.length) {
                        setSimPhase('correct')
                        setXpEarned(game.xp_reward || 20)
                      }
                    }
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                    foundWords.includes(word)
                      ? "bg-green-500/20 border-green-500/40 text-green-300"
                      : "bg-white/10 border-white/10 text-slate-400 hover:text-white"
                  )}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "CROSSWORD": {
        const clues = data.clues || [
          { clue: "Where you sleep in a hotel", answer: "ROOM", x: 0, y: 0, length: 4 }
        ]
        return (
          <div className="space-y-6">
             <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
               <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Clue</p>
               <p className="text-lg font-bold text-slate-200">"{clues[0].clue}"</p>
             </div>
             <div className="flex justify-center gap-2">
                {Array.from({ length: clues[0].length }).map((_, i) => (
                  <input
                    key={i}
                    maxLength={1}
                    className="h-12 w-12 bg-white/10 border-2 border-white/10 rounded-xl text-center text-xl font-black text-white focus:border-blue-500 outline-none uppercase"
                    onChange={(e) => {
                      const newGrid = { ...crosswordGrid, [`${i}`]: e.target.value.toUpperCase() }
                      setCrosswordGrid(newGrid)
                      const built = Array.from({ length: clues[0].length }).map((_, idx) => newGrid[`${idx}`] || "").join("")
                      if (built === clues[0].answer.toUpperCase()) {
                        setSimPhase('correct')
                        setXpEarned(game.xp_reward || 20)
                      }
                    }}
                  />
                ))}
             </div>
             <p className="text-center text-[10px] text-slate-500">Fill in the squares to solve</p>
          </div>
        )
      }

      case "PRONUNCIATION": {
        const sentence = currentQ.sentence || "May I help you with your luggage?"
        return (
          <div className="space-y-6 text-center">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
              <p className="text-xl font-bold text-slate-200 leading-relaxed">"{sentence}"</p>
            </div>
            <div className="flex flex-col items-center gap-4">
               <button 
                 className={cn(
                   "h-20 w-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95",
                   simPhase === 'play' ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20" : "bg-slate-700 animate-pulse"
                 )}
                 onClick={() => {
                    setSimPhase('done')
                    setTimeout(() => {
                      setSimPhase('correct')
                      setXpEarned(game.xp_reward || 20)
                    }, 2500)
                 }}
               >
                 <Mic className="h-8 w-8 text-white" />
               </button>
               <p className="text-xs text-slate-500 font-medium">
                 {simPhase === 'play' ? "Tap to start recording" : "Analyzing your pronunciation..."}
               </p>
            </div>
          </div>
        )
      }

      case "HANGMAN": {
        const word = (data.word || "HOSPITALITY").toUpperCase()
        const hint = data.hint || "Industry name"
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
        const displayWord = word.split("").map(l => guessedLetters.includes(l) ? l : "_")
        const isWin = !displayWord.includes("_")
        const isLoss = incorrectGuesses >= 6

        return (
          <div className="space-y-6 text-center">
            <p className="text-slate-400 text-sm italic">Hint: {hint}</p>
            <div className="text-4xl font-black tracking-[0.5em] text-white my-8">{displayWord.join("")}</div>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto">
              {letters.map(l => (
                <button
                  key={l}
                  disabled={guessedLetters.includes(l) || isWin || isLoss}
                  onClick={() => {
                    setGuessedLetters(prev => [...prev, l])
                    if (!word.includes(l)) setIncorrectGuesses(g => g + 1)
                  }}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                    guessedLetters.includes(l)
                      ? word.includes(l) ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"
                      : "bg-white/5 hover:bg-white/10 text-slate-400"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="text-rose-400 text-xs font-bold">Lives left: {6 - incorrectGuesses}</div>
            {(isWin || isLoss) && (
              <div className="animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
                <button 
                  onClick={() => {
                    if (isWin) { setScore(s => s + 50); setSimPhase('correct'); }
                    else setSimPhase('wrong');
                  }}
                  className="px-6 py-2 bg-blue-600 rounded-xl font-bold"
                >
                  See Result
                </button>
              </div>
            )}
          </div>
        )
      }

      case "TRUE_FALSE": {
        const statements = data.statements || [{ text: "A concierge is a chef.", correct: false }]
        const current = statements[qIndex % statements.length]
        return (
          <div className="space-y-8 text-center py-10">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <p className="text-xl font-bold text-white leading-relaxed">{current.text}</p>
            </div>
            <div className="flex justify-center gap-6">
              <button 
                onClick={() => checkAnswer("false", current.correct ? "true" : "false")}
                className="group flex flex-col items-center gap-2"
              >
                <div className="h-20 w-20 rounded-full bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-center group-hover:bg-rose-500/20 group-hover:border-rose-500/40 transition-all">
                  <X className="h-10 w-10 text-rose-500" />
                </div>
                <span className="text-sm font-bold text-rose-400">FALSE</span>
              </button>
              <button 
                onClick={() => checkAnswer("true", current.correct ? "true" : "false")}
                className="group flex flex-col items-center gap-2"
              >
                <div className="h-20 w-20 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 group-hover:border-green-500/40 transition-all">
                  <Check className="h-10 w-10 text-green-500" />
                </div>
                <span className="text-sm font-bold text-green-400">TRUE</span>
              </button>
            </div>
          </div>
        )
      }

      case "WORD_ASSOCIATION": {
        const base = data.base_word || "HOTEL"
        const associations = data.associations || ["Room", "Lobby", "Service"]
        return (
          <div className="space-y-6 text-center">
            <div className="text-sm text-slate-400">What relates to:</div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">{base}</div>
            <div className="flex flex-wrap justify-center gap-2">
              {associations.map((word: string) => (
                <button
                  key={word}
                  onClick={() => { setScore(s => s + 10); setSimPhase('correct'); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-sm font-medium"
                >
                  {word}
                </button>
              ))}
              <button onClick={() => setSimPhase('wrong')} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-sm font-medium">Coffee</button>
            </div>
          </div>
        )
      }

      case "CATEGORIZATION": {
        const cats = data.categories || ["Staff", "Tools"]
        const items = data.items || [{ text: "Waiter", category: "Staff" }, { text: "Tray", category: "Tools" }]
        const currentItem = items[qIndex % items.length]
        return (
          <div className="space-y-8 text-center">
            <div className="animate-bounce inline-block px-6 py-3 bg-white/10 border border-white/20 rounded-2xl text-xl font-bold text-white shadow-xl">
              {currentItem.text}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {cats.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => {
                    if (cat === currentItem.category) { setScore(s => s + 20); setSimPhase('correct'); }
                    else setSimPhase('wrong');
                  }}
                  className="h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 hover:border-blue-500/40 transition-all"
                >
                  <div className="h-10 w-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                    <Star className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-300">{cat}</span>
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "SYNONYM_ANTONYM": {
        const word = data.word || "Large"
        const type = data.type || "synonym"
        const opts = data.options || ["Big", "Small"]
        const correct = data.correct || "Big"
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-400">Find the {type} for:</p>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">{word}</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {opts.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, correct)}
                  className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-2xl text-left font-bold hover:bg-white/10 hover:border-violet-500/40 transition-all flex justify-between items-center"
                >
                  <span>{opt}</span>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "DIALOGUE_SIM": {
        const char = data.character || "Guest"
        const scene = data.scenario || "Checking in at the front desk"
        const lines = data.lines || [{ speaker: "Guest", text: "I have a reservation under Smith." }]
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl">
              <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold">🤖</div>
              <div>
                <p className="text-[10px] font-black uppercase text-blue-400">AI Character</p>
                <p className="font-bold text-white">{char}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 italic">Scene: {scene}</p>
            <div className="space-y-4">
              {lines.map((l: any, i: number) => (
                <div key={i} className="bg-white/10 p-4 rounded-2xl rounded-tl-none border-l-4 border-blue-500">
                  <p className="text-[10px] font-bold text-blue-300 mb-1">{l.speaker}</p>
                  <p className="text-sm text-white">{l.text}</p>
                </div>
              ))}
              <div className="animate-pulse flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI is typing...
              </div>
            </div>
            <button onClick={() => setSimPhase('done')} className="w-full py-3 bg-blue-600 rounded-xl font-bold">
              Practice Response
            </button>
          </div>
        )
      }

      case "EMOJI_TO_WORD": {
        const emojis = data.emojis || "🛌🏨"
        const answer = data.answer || "Hotel Room"
        return (
          <div className="space-y-8 text-center py-6">
            <div className="text-7xl mb-8 animate-in zoom-in duration-500 drop-shadow-2xl">{emojis}</div>
            <div className="grid grid-cols-2 gap-3">
              {[answer, "Lobby Bar", "Swimming Pool", "Elevator"].sort().map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, answer)}
                  className="py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "WORD_CHAIN": {
        const start = data.start_word || "Apple"
        return (
          <div className="space-y-6 text-center">
            <p className="text-sm text-slate-400">Start with the last letter of:</p>
            <h2 className="text-4xl font-black text-white">{start}</h2>
            <div className="text-xs text-blue-400 font-black tracking-widest uppercase">Last letter: {start.slice(-1).toUpperCase()}</div>
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
                placeholder={`Type a word starting with ${start.slice(-1)}...`}
                value={chainInput}
                onChange={e => setChainInput(e.target.value)}
              />
              <button 
                onClick={() => {
                  if (chainInput.toLowerCase().startsWith(start.slice(-1).toLowerCase())) setSimPhase('correct');
                  else setSimPhase('wrong');
                }}
                className="px-6 bg-blue-600 rounded-xl font-bold"
              >
                GO
              </button>
            </div>
          </div>
        )
      }

      case "PICTURE_DESCRIPTION": {
        const desc = data.image_description || "A luxury hotel lobby with a large chandelier"
        const keywords = data.keywords || ["chandelier", "lobby", "luxury"]
        return (
          <div className="space-y-6">
            <div className="h-48 bg-slate-700 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-slate-600">
              <span className="text-4xl mb-2">🖼️</span>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">[ IMAGE PREVIEW ]</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] text-center mt-2">{desc}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl">
              <p className="text-xs text-slate-400 mb-2">Target Keywords:</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw: string) => (
                  <span key={kw} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold uppercase">{kw}</span>
                ))}
              </div>
            </div>
            <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm" placeholder="Describe what you see in English..." rows={3} />
            <button onClick={() => setSimPhase('correct')} className="w-full py-3 bg-blue-600 rounded-xl font-bold">Submit Description</button>
          </div>
        )
      }

      case "ERROR_CORRECTION": {
        const inc = data.incorrect || "He don't like coffee."
        const cor = data.correct || "He doesn't like coffee."
        return (
          <div className="space-y-6">
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              <p className="text-xs font-black text-rose-500 uppercase mb-2">Find the error:</p>
              <p className="text-lg font-bold text-white line-through opacity-60 italic">"{inc}"</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[cor, "He doesn't likes coffee.", "He not like coffee."].map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, cor)}
                  className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-2xl text-left font-bold hover:bg-white/10 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "RAPID_FIRE": {
        return (
          <div className="space-y-8 text-center py-10">
            <div className="text-sm font-black text-rose-500 uppercase tracking-[0.3em] animate-pulse">Get Ready!</div>
            <div className="text-5xl font-black text-white scale-110 transition-transform">{["ROOM", "LOBBY", "STAFF", "GUEST"][qIndex % 4]}</div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setSimPhase('correct')} className="py-4 bg-white/5 border-2 border-white/10 rounded-2xl font-bold hover:bg-white/10 hover:border-blue-500/40">Kamar</button>
              <button onClick={() => setSimPhase('wrong')} className="py-4 bg-white/5 border-2 border-white/10 rounded-2xl font-bold hover:bg-white/10 hover:border-blue-500/40">Dapur</button>
            </div>
          </div>
        )
      }

      case "IDIOM_GUESSING": {
        const idiom = data.idiom || "Piece of cake"
        const answer = data.answer || "Very easy"
        return (
          <div className="space-y-6 text-center">
            <div className="h-40 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl flex items-center justify-center text-7xl">🍰</div>
            <h2 className="text-3xl font-black text-white">"{idiom}"</h2>
            <div className="grid grid-cols-1 gap-2">
              {[answer, "A slice of dessert", "A cooking challenge"].map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, answer)}
                  className="py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "RHYME_GAME": {
        const word = data.word || "Stay"
        const answer = data.answer || "Day"
        return (
          <div className="space-y-6 text-center">
            <p className="text-sm text-slate-400">What rhymes with:</p>
            <h2 className="text-4xl font-black text-white uppercase">{word}</h2>
            <div className="grid grid-cols-2 gap-4">
              {[answer, "Sky", "Go", "Be"].map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, answer)}
                  className="py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xl hover:bg-white/10 hover:border-violet-500/40 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "VOCABULARY_RPG": {
        const quest = data.quest || "Defeat the Dragon of Disinterest"
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-black uppercase text-blue-400"><span>Hero</span><span>{rpgHealth.player}%</span></div>
                <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${rpgHealth.player}%` }} />
                </div>
                <div className="text-4xl">🛡️</div>
              </div>
              <div className="text-xs font-black text-slate-600">VS</div>
              <div className="space-y-1 text-right">
                <div className="flex justify-between text-[8px] font-black uppercase text-rose-400"><span>{rpgHealth.monster}%</span><span>Monster</span></div>
                <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 transition-all" style={{ width: `${rpgHealth.monster}%` }} />
                </div>
                <div className="text-4xl">🐉</div>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-slate-400 mb-2">{quest}</p>
              <p className="font-bold text-white">"What is the plural of 'Child'?"</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setRpgHealth(h => ({ ...h, monster: h.monster - 25 })); if (rpgHealth.monster <= 25) setSimPhase('correct'); }} className="py-2 bg-blue-600 rounded-xl text-xs font-bold">Children</button>
              <button onClick={() => { setRpgHealth(h => ({ ...h, player: h.player - 25 })); if (rpgHealth.player <= 25) setSimPhase('wrong'); }} className="py-2 bg-rose-600 rounded-xl text-xs font-bold">Childs</button>
            </div>
          </div>
        )
      }

      case "DEBATE_MODE": {
        const topic = data.topic || "Should hotels charge for Wi-Fi?"
        const side = data.side || "Against"
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 rounded-3xl shadow-xl">
              <p className="text-[10px] font-black uppercase text-violet-200 mb-2 tracking-widest">Debate Topic</p>
              <h3 className="text-lg font-bold text-white leading-tight">{topic}</h3>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl">
              <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase", side === "Against" ? "bg-rose-500/20 text-rose-400" : "bg-green-500/20 text-green-400")}>
                Your Side: {side}
              </div>
            </div>
            <p className="text-xs text-slate-400 italic">Record your argument using professional hospitality English. AI will score your range and fluency.</p>
            <div className="flex justify-center py-4">
              <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Volume2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <button onClick={() => setSimPhase('done')} className="w-full py-4 bg-white/10 hover:bg-white/15 rounded-2xl font-bold transition-all">Submit Argument</button>
          </div>
        )
      }

      case "SHADOW_READING": {
        const text = data.text || "Welcome to the Grand Hotel. How can I help you today?"
        return (
          <div className="space-y-8">
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1 bg-blue-500 animate-progress" style={{ width: '40%' }} />
              <p className="text-2xl font-black text-white/40 leading-relaxed">
                <span className="text-blue-400">Welcome to the</span> Grand Hotel...
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 bg-rose-600 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-rose-600/30">
                <div className="h-6 w-6 bg-white rounded-full" />
              </div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Recording Now</p>
            </div>
            <button onClick={() => setSimPhase('correct')} className="w-full py-3 bg-white/10 rounded-xl font-bold">Stop & Review</button>
          </div>
        )
      }

      case "WORD_SNAP": {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-40 bg-white/5 border-2 border-white/10 rounded-3xl flex items-center justify-center text-4xl shadow-inner">🛌</div>
              <div className="h-40 bg-white/5 border-2 border-white/10 rounded-3xl flex items-center justify-center text-2xl font-black text-blue-400 shadow-inner">BED</div>
            </div>
            <div className="text-center py-4">
              <button 
                onClick={() => { setSnapMatch(true); setSimPhase('correct'); }}
                className="h-24 w-24 bg-blue-600 rounded-full font-black text-2xl shadow-xl shadow-blue-600/40 active:scale-95 transition-transform"
              >
                SNAP!
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">Tap when word matches image!</p>
          </div>
        )
      }

      case "TONGUE_TWISTER": {
        const twister = data.text || "Six slippery snails slid slowly seaward."
        return (
          <div className="space-y-6 text-center">
            <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 rounded-full text-[8px] font-black uppercase">Level: Hard</div>
              <p className="text-2xl font-black text-white italic">"{twister}"</p>
            </div>
            <div className="flex justify-center gap-4 py-4">
              <div className="h-14 w-14 bg-white/10 rounded-full flex items-center justify-center text-slate-400"><RotateCcw className="h-6 w-6" /></div>
              <div className="h-14 w-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"><Play className="h-6 w-6" /></div>
              <div className="h-14 w-14 bg-white/10 rounded-full flex items-center justify-center text-slate-400"><X className="h-6 w-6" /></div>
            </div>
            <button onClick={() => setSimPhase('correct')} className="w-full py-4 bg-violet-600 rounded-2xl font-bold shadow-lg shadow-violet-600/20">Check Pronunciation</button>
          </div>
        )
      }

      case "NEWS_HEADLINE": {
        const headline = data.headline || "Hospitality sector ____ as international travel surges."
        const answer = data.answer || "rebounds"
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-2 mb-4 border-b pb-2 border-slate-100">
                <div className="h-6 w-6 bg-slate-900 rounded flex items-center justify-center text-[10px] font-bold text-white italic">T</div>
                <span className="text-[10px] font-black text-slate-900 tracking-tight">The Hospitality Times</span>
              </div>
              <p className="text-lg font-black text-slate-900 leading-tight">"{headline}"</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[answer, "falls", "closes", "waits"].map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, answer)}
                  className="py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "SONG_LYRICS": {
        const lyrics = data.lyrics || "I'm checking in, checking out, and ____ the service."
        const answer = data.answer || "loving"
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-black p-6 rounded-3xl border border-white/10 relative">
              <div className="absolute top-4 right-4 animate-spin-slow">🎵</div>
              <p className="text-sm text-slate-400 mb-1 font-mono">0:45 / 3:20</p>
              <p className="text-lg font-medium text-white italic leading-relaxed">"{lyrics}"</p>
            </div>
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
                placeholder="Missing word..."
                value={chainInput}
                onChange={e => { 
                  setChainInput(e.target.value);
                  if (e.target.value.toLowerCase() === answer.toLowerCase()) setSimPhase('correct'); 
                }}
              />
              <button className="px-6 bg-teal-600 rounded-xl font-bold">PLAY</button>
            </div>
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
