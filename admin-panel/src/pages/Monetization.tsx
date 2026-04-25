import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { CreditCard, ToggleLeft, ToggleRight, Save, Loader2, Crown, Sparkles } from "lucide-react"
import { getFeatures, updateFeature, getMonetizationConfig, updateMonetizationConfig } from "../services/api"
import { cn } from "../lib/utils"

export default function Monetization() {
  const [activeTab, setActiveTab] = useState<"features" | "config">("features")

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Monetization</h2>
          <p className="text-slate-500 text-sm mt-1">Manage premium features and revenue configuration.</p>
        </div>
        <div className="flex bg-slate-100/50 p-1 rounded-xl">
          {(["features", "config"] as const).map((tab) => (
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
              {tab === "features" ? "Feature Access" : "Revenue Config"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "features" ? <FeaturesPanel /> : <MonetizationConfigPanel />}
    </div>
  )
}

function FeaturesPanel() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["features"],
    queryFn: getFeatures,
  })

  const mutation = useMutation({
    mutationFn: ({ name, body }: { name: string; body: any }) => updateFeature(name, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["features"] }),
  })

  const features = data?.data ?? data ?? []

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex items-center justify-center border border-slate-100">
        <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  if (!features || features.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <Crown className="h-12 w-12 text-slate-200 mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500">No features configured</p>
        <p className="text-xs text-slate-400 mt-1">Feature flags will appear here once configured in the backend.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {features.map((feat: any) => {
        const isEnabled = feat.is_enabled ?? feat.enabled ?? false
        return (
          <div
            key={feat.name || feat._id}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center mr-4",
                  isEnabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                )}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{feat.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{feat.description || "No description"}</p>
                  {feat.tier && (
                    <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700">
                      {feat.tier}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() =>
                  mutation.mutate({
                    name: feat.name,
                    body: { ...feat, is_enabled: !isEnabled, enabled: !isEnabled },
                  })
                }
                disabled={mutation.isPending}
                className="flex-shrink-0 ml-4"
                title={isEnabled ? "Disable feature" : "Enable feature"}
              >
                {isEnabled ? (
                  <ToggleRight className="h-8 w-8 text-emerald-500 hover:text-emerald-600 transition-colors" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-slate-300 hover:text-slate-400 transition-colors" />
                )}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonetizationConfigPanel() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<any>(null)

  const { data: config, isLoading } = useQuery({
    queryKey: ["monetization-config"],
    queryFn: getMonetizationConfig,
  })

  const editData = formData ?? config ?? {}

  const mutation = useMutation({
    mutationFn: (data: any) => updateMonetizationConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monetization-config"] })
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
      <div className="flex items-center mb-6">
        <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-slate-800">Revenue Configuration</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: "Ad Network ID", key: "ad_network_id", type: "text" },
          { label: "Banner Ad Unit", key: "banner_ad_unit", type: "text" },
          { label: "Interstitial Ad Unit", key: "interstitial_ad_unit", type: "text" },
          { label: "Rewarded Ad Unit", key: "rewarded_ad_unit", type: "text" },
          { label: "Monthly Price (USD)", key: "monthly_price", type: "number" },
          { label: "Yearly Price (USD)", key: "yearly_price", type: "number" },
          { label: "Apple Product ID", key: "apple_product_id", type: "text" },
          { label: "Google Product ID", key: "google_product_id", type: "text" },
        ].map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{field.label}</label>
            <input
              type={field.type}
              value={editData[field.key] ?? ""}
              onChange={(e) =>
                handleChange(field.key, field.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all"
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </div>
        ))}
      </div>

      {formData && (
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending}
            className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Configuration
          </button>
        </div>
      )}
    </div>
  )
}
