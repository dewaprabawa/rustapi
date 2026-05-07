import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { BrainCircuit, Scale, Save, Loader2, RefreshCw, Key, Trash, Check, Plus, MessageSquare, Edit, RotateCcw, Camera, Mic, Volume2, Play } from "lucide-react"
import { 
  getAiConfigs, 
  updateAiConfig, 
  getEvaluationWeights, 
  updateEvaluationWeights, 
  getApiKeys, 
  createApiKey, 
  deleteApiKey, 
  activateApiKey, 
  getAiPrompts, 
  updateAiPrompt, 
  updateAdminMe, 
  uploadAsset,
  getVoiceConfig,
  updateVoiceConfig,
  testTts
} from "../services/api"
import { cn, normalizeDate } from "../lib/utils"
import { useAuth } from "../contexts/AuthContext"

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"profile" | "api_keys" | "ai" | "ai_prompts" | "evaluation" | "voice" | "master_data">("profile")

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Settings</h2>
          <p className="text-slate-500 text-sm mt-1">AI engine configuration and evaluation criteria.</p>
        </div>
        <div className="flex bg-slate-100/50 p-1 rounded-xl overflow-x-auto max-w-full">
          {(["profile", "api_keys", "ai", "ai_prompts", "evaluation", "voice", "master_data"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                activeTab === tab
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab === "profile" ? "My Profile" : 
               tab === "api_keys" ? "API Keys" : 
               tab === "ai" ? "AI Config" : 
               tab === "ai_prompts" ? "AI Prompts" : 
               tab === "evaluation" ? "Evaluation Weights" : 
               tab === "voice" ? "Voice Engine" :
               "Master Data"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "profile" && <ProfilePanel />}
      {activeTab === "api_keys" && <ApiKeysManagerPanel />}
      {activeTab === "ai" && <AiConfigPanel />}
      {activeTab === "ai_prompts" && <AiPromptsPanel />}
      {activeTab === "evaluation" && <EvaluationWeightsPanel />}
      {activeTab === "voice" && <VoiceConfigPanel />}
      {activeTab === "master_data" && <MasterDataPanel />}
    </div>
  )
}

function MasterDataPanel() {
  const queryClient = useQueryClient()
  const { data: masterDataList, isLoading } = useQuery({
    queryKey: ['master-data'],
    queryFn: () => import("../services/api").then(m => m.listMasterData())
  })

  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [optionsText, setOptionsText] = useState("")

  const updateMutation = useMutation({
    mutationFn: ({ category, options }: { category: string, options: string[] }) => 
      import("../services/api").then(m => m.updateMasterData(category, options)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data'] })
      setEditingCategory(null)
    },
    onError: () => alert("Failed to update master data")
  })

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            Global Master Data
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Manage global dropdown options and shared identifiers across the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {(masterDataList || []).map((item: any) => (
            <div key={item.category} className="border border-slate-100 rounded-2xl p-6 bg-slate-50/30">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-slate-800 capitalize">{item.category.replace(/_/g, ' ')}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Key: {item.category}</p>
                </div>
                {editingCategory !== item.category ? (
                  <button 
                    onClick={() => {
                      setEditingCategory(item.category)
                      setOptionsText(item.options.join('\n'))
                    }}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Edit Options
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingCategory(null)}
                      className="text-xs font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        const options = optionsText.split('\n').map(s => s.trim()).filter(s => s.length > 0)
                        updateMutation.mutate({ category: item.category, options })
                      }}
                      disabled={updateMutation.isPending}
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-blue-200"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>

              {editingCategory === item.category ? (
                <textarea 
                  className="w-full min-h-[150px] p-4 text-sm font-mono bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  value={optionsText}
                  onChange={e => setOptionsText(e.target.value)}
                  placeholder="Enter one option per line..."
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {item.options.map((opt: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


function VoiceConfigPanel() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    stt_provider: "deepgram",
    tts_provider: "elevenlabs",
    elevenlabs_voice_id: "",
    deepgram_api_key: "",
    elevenlabs_api_key: "",
    language: "en-US",
  })
  const [testText, setTestText] = useState("Hello, welcome to the Hospitality English learning platform. I will be your AI coach today.")
  const [isPlaying, setIsPlaying] = useState(false)

  const { data: config, isLoading } = useQuery({
    queryKey: ['voice-config'],
    queryFn: getVoiceConfig,
  })

  useEffect(() => {
    if (config) {
      setFormData({
        stt_provider: config.stt_provider || "deepgram",
        tts_provider: config.tts_provider || "elevenlabs",
        elevenlabs_voice_id: config.elevenlabs_voice_id || "",
        deepgram_api_key: config.deepgram_api_key || "",
        elevenlabs_api_key: config.elevenlabs_api_key || "",
        language: config.language || "en-US",
      })
    }
  }, [config])

  const saveMutation = useMutation({
    mutationFn: (data: any) => updateVoiceConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-config'] })
      alert("Voice configuration saved successfully!")
    },
    onError: () => {
      alert("Failed to save configuration.")
    }
  })

  const testTtsMutation = useMutation({
    mutationFn: (data: any) => testTts(data),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      setIsPlaying(true)
      audio.play()
      audio.onended = () => setIsPlaying(false)
    },
    onError: (err: any) => {
      alert(`Test TTS failed. ${err?.response?.data || ''}`)
    }
  })

  const handleSave = () => {
    saveMutation.mutate(formData)
  }

  const handleTestTts = () => {
    if (!formData.elevenlabs_api_key && formData.tts_provider === 'elevenlabs') {
      alert("Please save an API key first before testing.")
      return
    }
    testTtsMutation.mutate({ text: testText, voice_id: formData.elevenlabs_voice_id })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex items-center justify-center border border-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-indigo-500" />
              Voice Abstraction Layer
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Configure STT (Speech-to-Text) and TTS (Text-to-Speech) providers for the speaking engine.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Voice Config
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* STT Config */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Speech-to-Text (STT)</h4>
                <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Pronunciation Engine</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Active Provider</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  value={formData.stt_provider}
                  onChange={e => setFormData({ ...formData, stt_provider: e.target.value })}
                >
                  <option value="deepgram">Deepgram Nova-2 (Default)</option>
                  <option value="whisper">OpenAI Whisper (Fallback)</option>
                  <option value="gcp">Google Cloud STT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Provider API Key</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-mono"
                  placeholder="Deepgram / OpenAI API Key..."
                  value={formData.deepgram_api_key}
                  onChange={e => setFormData({ ...formData, deepgram_api_key: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* TTS Config */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Text-to-Speech (TTS)</h4>
                <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">AI Coach Responses</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Active Provider</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  value={formData.tts_provider}
                  onChange={e => setFormData({ ...formData, tts_provider: e.target.value })}
                >
                  <option value="elevenlabs">ElevenLabs (Default)</option>
                  <option value="gcp">Google Cloud TTS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Provider API Key</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-mono"
                  placeholder="ElevenLabs API Key..."
                  value={formData.elevenlabs_api_key}
                  onChange={e => setFormData({ ...formData, elevenlabs_api_key: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Default Voice ID</label>
                <input
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-mono"
                  placeholder="e.g. ErXwobaYiN019PkySvjV"
                  value={formData.elevenlabs_voice_id}
                  onChange={e => setFormData({ ...formData, elevenlabs_voice_id: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Test Section */}
          <div className="lg:col-span-2 mt-4 pt-6 border-t border-slate-100">
            <h4 className="font-semibold text-slate-800 mb-4">Test Voice Engine</h4>
            <div className="flex gap-4 items-center">
              <textarea
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none min-h-[80px]"
                value={testText}
                onChange={e => setTestText(e.target.value)}
                placeholder="Type something to test TTS..."
              />
              <button
                onClick={handleTestTts}
                disabled={testTtsMutation.isPending || isPlaying}
                className="shrink-0 flex items-center justify-center h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 hover:scale-105 transition-all shadow-sm"
              >
                {testTtsMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                 isPlaying ? <Volume2 className="h-6 w-6 animate-pulse" /> : 
                 <Play className="h-6 w-6 ml-1" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AiConfigPanel() {
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ai-configs"],
    queryFn: getAiConfigs,
  })

  const configs = data?.data ?? data ?? []

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const mutation = useMutation({
    mutationFn: ({ key, body }: { key: string; body: any }) => updateAiConfig(key, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-configs"] })
      setEditingKey(null)
      setEditValue("")
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex items-center justify-center border border-slate-100">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  if (!configs || configs.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <BrainCircuit className="h-12 w-12 text-slate-200 mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500">No AI configurations found</p>
        <p className="text-xs text-slate-400 mt-1">AI config keys will appear here once set in the backend.</p>
        <button onClick={() => refetch()} className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center mx-auto">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {configs.map((cfg: any) => {
        const key = cfg.key || cfg.name || cfg._id
        const isEditing = editingKey === key
        return (
          <div key={key} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mr-3">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">{key}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Last updated: {cfg.updated_at ? new Date(cfg.updated_at.$date || cfg.updated_at).toLocaleString() : "—"}</p>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={() => {
                    setEditingKey(key)
                    setEditValue(typeof cfg.value === "string" ? cfg.value : JSON.stringify(cfg.value, null, 2))
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="mt-3 space-y-3">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all resize-y"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setEditingKey(null); setEditValue("") }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      let parsed = editValue
                      try { parsed = JSON.parse(editValue) } catch { /* keep as string */ }
                      mutation.mutate({ key, body: { value: parsed } })
                    }}
                    disabled={mutation.isPending}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {mutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 bg-slate-50 rounded-xl p-4 max-h-32 overflow-auto">
                <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap break-words">
                  {typeof cfg.value === "string" ? cfg.value : JSON.stringify(cfg.value, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EvaluationWeightsPanel() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["evaluation-weights"],
    queryFn: getEvaluationWeights,
  })

  const weights = formData ?? data ?? {}

  const mutation = useMutation({
    mutationFn: (data: any) => updateEvaluationWeights(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-weights"] })
      setFormData(null)
    },
  })

  const handleChange = (field: string, value: number) => {
    setFormData({ ...weights, [field]: value })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex items-center justify-center border border-slate-100">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  const weightFields = [
    { key: "grammar", label: "Grammar Accuracy", color: "bg-blue-500" },
    { key: "vocabulary", label: "Vocabulary Range", color: "bg-indigo-500" },
    { key: "fluency", label: "Fluency", color: "bg-violet-500" },
    { key: "pronunciation", label: "Pronunciation", color: "bg-purple-500" },
    { key: "relevance", label: "Relevance", color: "bg-fuchsia-500" },
    { key: "confidence", label: "Confidence", color: "bg-pink-500" },
  ]

  const totalWeight = weightFields.reduce((sum, f) => sum + (weights[f.key] ?? 0), 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Scale className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-slate-800">Evaluation Criteria Weights</h3>
        </div>
        <span className={cn(
          "text-sm font-medium px-3 py-1 rounded-full",
          totalWeight === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        )}>
          Total: {totalWeight}%
        </span>
      </div>

      <div className="space-y-6">
        {weightFields.map((field) => {
          const val = weights[field.key] ?? 0
          return (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">{field.label}</label>
                <span className="text-sm font-semibold text-slate-800 tabular-nums w-12 text-right">{val}%</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-300", field.color)} style={{ width: `${val}%` }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) => handleChange(field.key, parseInt(e.target.value))}
                  className="w-32 accent-blue-600"
                />
              </div>
            </div>
          )
        })}
      </div>

      {formData && (
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending}
            className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Weights
          </button>
        </div>
      )}
    </div>
  )
}

function ApiKeysManagerPanel() {
  const queryClient = useQueryClient()
  const [newProvider, setNewProvider] = useState("gemini")
  const [newName, setNewName] = useState("")
  const [newKey, setNewKey] = useState("")

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: getApiKeys,
  })

  const createMutation = useMutation({
    mutationFn: (data: { provider: string, name: string, api_key: string }) => createApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      setNewName("")
      setNewKey("")
    }
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] })
  })

  const handleAddKey = () => {
    if (!newKey.trim()) return
    createMutation.mutate({ provider: newProvider, name: newName || `${newProvider} Key`, api_key: newKey })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex items-center justify-center border border-slate-100">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
      <div>
        <div className="flex items-center mb-1">
          <Key className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-slate-800">Add New API Key</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">Keys are stored securely in MongoDB. The active key is used for AI translations and content generation.</p>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-3">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="aicc">AICC (OpenAI-compatible)</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <input
              type="text"
              placeholder="Name (e.g. My Workspace)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="md:col-span-5">
            <input
              type="password"
              placeholder="Paste API Key here..."
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="md:col-span-1 flex">
            <button
              onClick={handleAddKey}
              disabled={!newKey.trim() || createMutation.isPending}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-colors"
            >
              {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Saved Keys</h3>
        {keys.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Key className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No API keys saved yet.</p>
            <p className="text-xs text-slate-400 mt-1">Add a Gemini API key above to enable AI features.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k: any) => {
              const id = k._id
              const isActive = k.is_active
              return (
                <div key={id} className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all",
                  isActive ? "border-blue-200 bg-blue-50/30 shadow-sm shadow-blue-100" : "border-slate-100 bg-white hover:border-slate-200"
                )}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => activateMutation.mutate(id)}
                      disabled={activateMutation.isPending}
                      className={cn(
                        "h-6 w-6 rounded-full border flex items-center justify-center transition-colors",
                        isActive ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 hover:border-blue-400"
                      )}
                    >
                      {isActive && <Check className="h-3 w-3 text-white" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{k.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {k.provider}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        {k.api_key_masked}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteMutation.mutate(id)}
                    disabled={deleteMutation.isPending}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function AiPromptsPanel() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["ai-prompts"], queryFn: getAiPrompts })
  const prompts = data || []
  
  const [selectedEntity, setSelectedEntity] = useState<string>("course")
  const [promptValue, setPromptValue] = useState<string>("")
  const [isEditing, setIsEditing] = useState(false)

  const defaultPrompts: Record<string, string> = {
    course: "Generate a JSON object for a new English learning course for the {context}. The JSON must have exactly these keys: \"title\", \"title_id\" (Indonesian title), \"description\", \"description_id\" (Indonesian description). Make description a clean plain text summary.",
    module: "Generate a JSON object for a new learning module within a {context} English course. The JSON must have exactly these keys: \"title\", \"title_id\" (Indonesian title), \"description\", \"description_id\" (Indonesian description). Make description a clean plain text summary.",
    lesson: "Generate a JSON object for a new lesson within a {context} English course. The JSON must have exactly these 4 keys:\n1. \"title\": A catchy title.\n2. \"title_id\": Indonesian title.\n3. \"content\": MUST be a single PLAIN TEXT string using MARKDOWN. DO NOT use nested JSON objects. Include ## Headers, **bold**, and lists.\n4. \"content_id\": Indonesian translation of the markdown content.",
    game: "Generate a JSON object for a hospitality English mini-game. Context: {context}. Keys: \"title\", \"instructions\" (plain text), \"data_json\" (exercise object). Structure data_json based on game type (SCENE_MATCHER, WORD_SCRAMBLE, MATCHING, etc.) with exactly 5 items.",
    scenario: "You are an expert curriculum designer for hospitality English training.\nGenerate a realistic, high-quality speaking practice scenario based on this topic: \"{context}\"\nThe target student level is: {level}\n\n## Format Requirement\nReturn ONLY a JSON object with this exact structure:\n{\n  \"title\": \"Clear scenario title\",\n  \"description\": \"Short 1-sentence description of the learning goal\",\n  \"role_ai\": \"The persona for the AI coach (e.g. Grumpy Guest)\",\n  \"role_user\": \"The persona for the student (e.g. Front Desk Receptionist)\",\n  \"initial_message\": \"The very first line the AI says to start the roleplay\",\n  \"context\": \"Hidden instructions for the AI: details about the situation, the AI's mood, and what it wants from the student. Keep it professional but engaging.\",\n  \"target_vocabulary\": [\"word1\", \"word2\", \"word3\", \"word4\", \"word5\"]\n}",
    shadowing: "You are an expert English language curriculum designer.\nGenerate a SpeakUp drill for the topic: '{context}'.\nContent Type: shadowing\nDifficulty: {difficulty}\n\nReturn a JSON object with:\n- title: A catchy title\n- transcript: The full target sentence or paragraph (natural and useful for hospitality)\n- target_wpm: Recommended speed (Beginner: 80-100, Inter: 120-140, Advanced: 160+)\n\nIMPORTANT: Return ONLY the JSON object, no markdown, no explanation.",
    expansion: "You are an expert English language curriculum designer.\nGenerate a SpeakUp drill for the topic: '{context}'.\nContent Type: expansion\nDifficulty: {difficulty}\n\nReturn a JSON object with:\n- title: A catchy title\n- transcript: The full target sentence or paragraph (natural and useful for hospitality)\n- steps: An array of strings building the sentence clause-by-clause (3-5 steps)\n- target_wpm: Recommended speed (Beginner: 80-100, Inter: 120-140, Advanced: 160+)\n\nIMPORTANT: Return ONLY the JSON object, no markdown, no explanation."
  }

  const currentPromptObj = prompts.find((p: any) => p.entity_type === selectedEntity)
  const displayPrompt = isEditing ? promptValue : (currentPromptObj?.prompt_template || defaultPrompts[selectedEntity] || "")

  const mutation = useMutation({
    mutationFn: ({ entity, prompt }: { entity: string, prompt: string }) => updateAiPrompt(entity, prompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-prompts"] })
      setIsEditing(false)
    }
  })

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
      <div className="flex items-center space-x-3 text-slate-800">
        <MessageSquare className="h-6 w-6 text-indigo-600" />
        <h3 className="text-lg font-bold">AI Generation Prompts</h3>
      </div>
      <p className="text-sm text-slate-500">
        Customize the prompts sent to the AI when generating content. Use <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{`{context}`}</code> as a placeholder for the context string (e.g., "hospitality industry", "front desk"). For some tools, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{`{level}`}</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{`{difficulty}`}</code> is also available. Ensure the requested JSON structure remains intact.
      </p>

      <div className="flex flex-wrap gap-2">
        {['course', 'module', 'lesson', 'game', 'scenario', 'shadowing', 'expansion'].map(entity => (
          <button
            key={entity}
            onClick={() => {
              setSelectedEntity(entity)
              setIsEditing(false)
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
              selectedEntity === entity ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            {entity}
          </button>
        ))}
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-slate-700 text-sm capitalize">{selectedEntity} Prompt</h4>
          {!isEditing ? (
            <button 
              onClick={() => {
                setPromptValue(currentPromptObj?.prompt_template || defaultPrompts[selectedEntity] || "")
                setIsEditing(true)
              }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              <Edit className="h-3 w-3 mr-1" /> Edit Prompt
            </button>
          ) : (
             <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    if (window.confirm("Reset this prompt to default?")) {
                      setPromptValue(defaultPrompts[selectedEntity])
                      setIsEditing(true)
                    }
                  }}
                  className="px-3 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 bg-white border border-amber-200 rounded-md transition-colors mr-2"
                >
                  <RotateCcw className="h-3 w-3 mr-1 inline" /> Reset
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => mutation.mutate({ entity: selectedEntity, prompt: promptValue })}
                  disabled={mutation.isPending}
                  className="flex items-center px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Save
                </button>
             </div>
          )}
        </div>
        
        {isEditing ? (
          <textarea
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            className="w-full h-64 p-4 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y"
          />
        ) : (
          <div className="w-full min-h-32 p-4 text-sm font-mono bg-slate-800 text-slate-200 rounded-lg whitespace-pre-wrap overflow-y-auto">
            {displayPrompt}
          </div>
        )}
      </div>
    </div>
  )
}

function ProfilePanel() {
  const { admin, setAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState(admin?.name || "")
  const [isUploading, setIsUploading] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: { name?: string, profile_image_url?: string }) => updateAdminMe(data),
    onSuccess: (updatedAdmin) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "me"] })
      setAdmin(updatedAdmin)
    }
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const { url } = await uploadAsset(file)
      mutation.mutate({ profile_image_url: url })
    } catch (error) {
      console.error("Upload failed", error)
    } finally {
      setIsUploading(false)
    }
  }

  const adminAvatar = admin?.profile_image_url 
    ? `${admin.profile_image_url}${admin.profile_image_url.includes('?') ? '&' : '?'}t=${normalizeDate(admin.updated_at)?.getTime() || Date.now()}`
    : null

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-8 animate-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-xl flex items-center justify-center text-slate-400 font-bold text-4xl overflow-hidden">
              {adminAvatar ? (
                <img src={adminAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                admin?.name?.[0] || admin?.email?.[0]?.toUpperCase() || "A"
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 h-10 w-10 bg-blue-600 text-white rounded-xl shadow-lg border-2 border-white flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
              <Camera className="h-5 w-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
            </label>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrator</p>
        </div>

        {/* Info Section */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={admin?.email || ""}
                disabled
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => mutation.mutate({ name })}
              disabled={mutation.isPending || name === admin?.name}
              className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Update Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
