import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Gamepad2 } from "lucide-react"
import { 
  getGamificationConfig, 
  getGames, 
  createGame, 
  deleteGame, 
  getLessons, 
  uploadAsset, 
  updateGame, 
  aiGenerateContent 
} from "../services/api"
import { getId } from "../lib/utils"

// Sub-components
import { GamificationHeader } from "../components/gamification/GamificationHeader"
import { GamificationConfigPanel } from "../components/gamification/GamificationConfigPanel"
import { GameGrid } from "../components/gamification/GameGrid"
import { GameModal } from "../components/gamification/GameModal"
import { GameSimulation } from "../components/gamification/GameSimulation"

export default function Gamification() {
  const [activeTab, setActiveTab] = useState<"config" | "games">("config")

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["gamification-config"],
    queryFn: getGamificationConfig,
  })

  const { data: gamesData, isLoading: gamesLoading } = useQuery({
    queryKey: ["games"],
    queryFn: () => getGames(),
  })

  const games = gamesData?.data ?? gamesData ?? []

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <GamificationHeader 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {activeTab === "config" ? (
        <GamificationConfigPanel config={config} isLoading={configLoading} />
      ) : (
        <GamesPanel games={games} isLoading={gamesLoading} />
      )}
    </div>
  )
}

function GamesPanel({ games, isLoading }: { games: any[]; isLoading: boolean }) {
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [simGame, setSimGame] = useState<any>(null)
  
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
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateGame(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] })
      setIsCreateModalOpen(false)
      setEditingGameId(null)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGame(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["games"] }),
  })

  const resetForm = () => {
    setFormData({
      title: "", game_type: "SCENE_MATCHER", lesson_id: "", module_id: "", difficulty: "easy", xp_reward: 20, instructions: "", asset_url: "", data_json: "{}"
    })
  }

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
      alert(err?.response?.status === 404 
        ? "No active API key. Go to Settings → API Keys to add one." 
        : "AI generation failed. Check your API key in Settings.")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleSubmit = () => {
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex items-center justify-center border border-slate-100">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditingGameId(null)
            resetForm()
            setIsCreateModalOpen(true)
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all shadow-blue-600/20 hover:shadow-blue-600/40"
        >
          <Gamepad2 className="mr-2 h-4 w-4" />
          Create Game
        </button>
      </div>

      <GameGrid 
        games={games}
        onSimulate={setSimGame}
        onEdit={(game) => {
          setEditingGameId(getId(game))
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
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <GameModal 
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setEditingGameId(null); }}
        editingGameId={editingGameId}
        formData={formData}
        setFormData={setFormData}
        onAiGenerate={handleAIGenerate}
        isGeneratingAI={isGeneratingAI}
        lessons={lessons}
        onFileUpload={handleFileUpload}
        isUploading={isUploading}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {simGame && (
        <GameSimulation 
          game={simGame}
          onClose={() => setSimGame(null)}
        />
      )}
    </div>
  )
}
