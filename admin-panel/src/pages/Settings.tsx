import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { BrainCircuit, Scale, Save, Loader2, RefreshCw } from "lucide-react"
import { getAiConfigs, updateAiConfig, getEvaluationWeights, updateEvaluationWeights } from "../services/api"
import { cn } from "../lib/utils"

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"ai" | "evaluation">("ai")

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Settings</h2>
          <p className="text-slate-500 text-sm mt-1">AI engine configuration and evaluation criteria.</p>
        </div>
        <div className="flex bg-slate-100/50 p-1 rounded-xl">
          {(["ai", "evaluation"] as const).map((tab) => (
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
              {tab === "ai" ? "AI Config" : "Evaluation Weights"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "ai" ? <AiConfigPanel /> : <EvaluationWeightsPanel />}
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
