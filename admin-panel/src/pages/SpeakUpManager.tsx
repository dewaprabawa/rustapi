import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Mic, TextCursorInput, Settings2, X, Target, Info, Trash2, Loader2, Waves, ChevronRight, Sparkles } from "lucide-react"
import { getSpeakUpContent, createSpeakUpContent, updateSpeakUpContent, deleteSpeakUpContent, aiGenerateSpeakUp } from "../services/api"
import { cn } from "../lib/utils"

export default function SpeakUpManager() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"shadowing" | "expansion">("shadowing")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    title: "",
    transcript: "",
    content_type: "shadowing",
    difficulty: "Beginner",
    target_wpm: 120,
    audio_url: "",
    steps: "" // Comma separated for UI, array for API
  })

  const { data: contents, isLoading } = useQuery({
    queryKey: ['speakup-content'],
    queryFn: getSpeakUpContent,
  })

  const getItemId = (item: any) => {
    if (!item?._id) return ""
    return typeof item._id === 'object' ? item._id.$oid : item._id
  }

  const filteredContents = contents?.filter((c: any) => c.content_type === activeTab) || []

  const createMutation = useMutation({
    mutationFn: createSpeakUpContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speakup-content'] })
      closeModal()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateSpeakUpContent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speakup-content'] })
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSpeakUpContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speakup-content'] })
    }
  })

  const aiMutation = useMutation({
    mutationFn: aiGenerateSpeakUp,
    onSuccess: (data: any) => {
      setFormData({
        ...formData,
        title: data.title,
        transcript: data.transcript,
        target_wpm: data.target_wpm || 120,
        steps: Array.isArray(data.steps) ? data.steps.join('\n') : ""
      })
    }
  })

  const handleAiGenerate = () => {
    if (!formData.title) {
      alert("Please enter a topic in the Title field first!")
      return
    }
    aiMutation.mutate({
      topic: formData.title,
      type: activeTab,
      difficulty: formData.difficulty
    })
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setFormData({
      title: "",
      transcript: "",
      content_type: activeTab,
      difficulty: "Beginner",
      target_wpm: 120,
      audio_url: "",
      steps: ""
    })
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      transcript: item.transcript,
      content_type: item.content_type,
      difficulty: item.difficulty,
      target_wpm: item.target_wpm || 120,
      audio_url: item.audio_url || "",
      steps: Array.isArray(item.steps) ? item.steps.join('\n') : ""
    })
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      steps: formData.steps.split('\n').map(s => s.trim()).filter(Boolean)
    }
    
    if (editingItem) {
      updateMutation.mutate({ id: getItemId(editingItem), data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Waves className="h-6 w-6 text-blue-500" />
            SpeakUp Fluency Content
          </h2>
          <p className="text-slate-500 text-sm mt-1">Design shadowing and expansion drills for rapid fluency gains.</p>
        </div>
        
        <button 
          onClick={() => {
            setFormData({...formData, content_type: activeTab});
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {activeTab === 'shadowing' ? 'Shadowing' : 'Expansion'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("shadowing")}
          className={cn(
            "px-6 py-2 text-sm font-bold rounded-xl transition-all",
            activeTab === "shadowing" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Shadowing
        </button>
        <button
          onClick={() => setActiveTab("expansion")}
          className={cn(
            "px-6 py-2 text-sm font-bold rounded-xl transition-all",
            activeTab === "expansion" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Sentence Expansion
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredContents.map((item: any) => (
            <div key={getItemId(item)} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all group relative">
               <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => handleEdit(item)}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors border border-slate-100 hover:border-blue-200"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm("Delete this drill?")) {
                      deleteMutation.mutate(getItemId(item))
                    }
                  }}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors border border-slate-100 hover:border-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center",
                  activeTab === 'shadowing' ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600"
                )}>
                  {activeTab === 'shadowing' ? <Mic className="h-6 w-6" /> : <TextCursorInput className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.difficulty}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{item.target_wpm} WPM Goal</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">{item.title}</h3>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                <p className="text-slate-600 text-sm italic font-medium">"{item.transcript}"</p>
              </div>

              {item.steps && item.steps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progressive Steps</p>
                  {item.steps.map((step: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
                      <ChevronRight className="h-3 w-3 text-teal-400" />
                      <span className="truncate">{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredContents.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
              <p className="text-slate-400 font-medium">No {activeTab} drills found.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-blue-600 font-bold hover:underline"
              >
                Create your first one
              </button>
            </div>
          )}
        </div>
      )}

      {/* Management Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {editingItem ? 'Edit Drill' : `New ${activeTab === 'shadowing' ? 'Shadowing' : 'Expansion'} Drill`}
                </h3>
                <p className="text-slate-500 text-sm mt-1">Configure fluency practice content.</p>
              </div>
              <button onClick={closeModal} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title / Topic</label>
                  <div className="flex gap-2">
                    <input 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
                      placeholder="e.g. Check-in Greeting"
                    />
                    <button
                      type="button"
                      onClick={handleAiGenerate}
                      disabled={aiMutation.isPending}
                      className="px-6 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-all flex items-center gap-2 font-bold text-sm whitespace-nowrap shadow-sm shadow-amber-200/20"
                    >
                      {aiMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      AI Magic
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Transcript</label>
                  <textarea 
                    required
                    value={formData.transcript}
                    onChange={e => setFormData({...formData, transcript: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[100px] font-medium text-slate-600"
                    placeholder="Enter the complete sentence or paragraph..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Difficulty</label>
                  <select 
                    value={formData.difficulty}
                    onChange={e => setFormData({...formData, difficulty: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Target WPM</label>
                  <input 
                    type="number"
                    value={formData.target_wpm}
                    onChange={e => setFormData({...formData, target_wpm: parseInt(e.target.value)})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
                  />
                </div>

                {activeTab === 'shadowing' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Target className="h-3 w-3" /> Native Audio URL (MP3)
                    </label>
                    <input 
                      value={formData.audio_url}
                      onChange={e => setFormData({...formData, audio_url: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-mono"
                      placeholder="https://example.com/audio.mp3"
                    />
                  </div>
                )}

                {activeTab === 'expansion' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Info className="h-3 w-3" /> Progressive Steps (One per line)
                    </label>
                    <textarea 
                      value={formData.steps}
                      onChange={e => setFormData({...formData, steps: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[150px] text-sm"
                      placeholder="Welcome&#10;Welcome to our hotel&#10;Welcome to our hotel, how can I help you?"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 px-8 py-4 border-2 border-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-[2] px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>{editingItem ? 'Update Drill' : 'Create Drill'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
