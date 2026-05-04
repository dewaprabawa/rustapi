import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { BrainCircuit, Scale, Save, Loader2, RefreshCw, Key, Trash, Check, Plus, MessageSquare, Edit, RotateCcw } from "lucide-react"
import { getAiConfigs, updateAiConfig, getEvaluationWeights, updateEvaluationWeights, getApiKeys, createApiKey, deleteApiKey, activateApiKey, getAiPrompts, updateAiPrompt } from "../services/api"
import { cn } from "../lib/utils"

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"api_keys" | "ai" | "ai_prompts" | "evaluation">("api_keys")

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Settings</h2>
          <p className="text-slate-500 text-sm mt-1">AI engine configuration and evaluation criteria.</p>
        </div>
        <div className="flex bg-slate-100/50 p-1 rounded-xl">
          {(["api_keys", "ai", "ai_prompts", "evaluation"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                activeTab === tab
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab === "api_keys" ? "API Keys" : tab === "ai" ? "AI Config" : tab === "ai_prompts" ? "AI Prompts" : "Evaluation Weights"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "api_keys" ? <ApiKeysManagerPanel /> : activeTab === "ai" ? <AiConfigPanel /> : activeTab === "ai_prompts" ? <AiPromptsPanel /> : <EvaluationWeightsPanel />}
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
    game: "Generate a JSON object for a hospitality English mini-game. Context: {context}. Keys: \"title\", \"instructions\" (plain text), \"data_json\" (exercise object). Structure data_json based on game type (SCENE_MATCHER, WORD_SCRAMBLE, MATCHING, etc.) with exactly 5 items."
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
        Customize the prompts sent to the AI when generating content. Use <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{`{context}`}</code> as a placeholder for the context string (e.g., "hospitality industry", "front desk"). Ensure the requested JSON structure remains intact.
      </p>

      <div className="flex space-x-2">
        {['course', 'module', 'lesson', 'game'].map(entity => (
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
