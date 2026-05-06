import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Mic, TextCursorInput, Settings2, X, Target, Info, Trash2, Loader2, Waves, ChevronRight, Sparkles, Play, BarChart3, Volume2, CircleStop, RotateCcw, Check } from "lucide-react"
import { getSpeakUpContent, createSpeakUpContent, updateSpeakUpContent, deleteSpeakUpContent, aiGenerateSpeakUp, analyzeSpeakUpTest } from "../services/api"
import { cn, getId, formatError } from "../lib/utils"

const SUGGESTED_TOPICS = [
  "Check-in Greeting",
  "Room Service Request",
  "Complaint Handling",
  "Directions to Facilities",
  "Restaurant Reservation",
  "Checkout Process",
  "Local Recommendations",
  "Housekeeping Request",
  "Bell Desk Assistance",
  "Spa Appointment",
  "Airport Shuttle Inquiry",
  "Breakfast Buffet Info",
  "Concierge Booking",
  "Emergency Procedures",
  "Wi-Fi Connectivity Help"
]

export default function SpeakUpManager() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"shadowing" | "expansion">("shadowing")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [simItem, setSimItem] = useState<any>(null)
  const [simPhase, setSimPhase] = useState<'idle' | 'listening' | 'recording' | 'analyzing' | 'results'>('idle')
  const [simHighlight, setSimHighlight] = useState(-1)
  const [simExpStep, setSimExpStep] = useState(0)
  const [simResults, setSimResults] = useState<any>(null)
  const simTimerRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  const [formData, setFormData] = useState({
    title: "",
    title_id: "",
    transcript: "",
    transcript_id: "",
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
        title: data.title || formData.title,
        title_id: data.title_id || "",
        transcript: data.transcript,
        transcript_id: data.transcript_id || "",
        target_wpm: data.target_wpm || 120,
        steps: Array.isArray(data.steps) ? data.steps.join('\n') : ""
      })
    },
    onError: (err: any) => {
      alert(`AI Error: ${formatError(err)}`)
    }
  })

  const analyzeMutation = useMutation({
    mutationFn: ({ contentId, audioBlob }: { contentId: string, audioBlob: Blob }) => 
      analyzeSpeakUpTest(contentId, audioBlob),
    onSuccess: (data: any) => {
      setSimResults(data)
      setSimPhase('results')
    },
    onError: (err: any) => {
      console.error("Analysis failure detail:", err)
      const errorMsg = err.response?.data?.message || err.message || "Unknown analysis error"
      alert(`Analysis Failed: ${errorMsg}\n\nPlease check if your audio was recorded correctly and if the Deepgram API key is configured.`)
      setSimPhase('idle')
    }
  })

  const handleAiGenerate = () => {
    if (!formData.title) {
      alert("Please enter a topic in the Title field first!")
      return
    }
    aiMutation.mutate({
      topic: formData.title,
      content_type: activeTab,
      difficulty: formData.difficulty
    })
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setFormData({
      title: "",
      title_id: "",
      transcript: "",
      transcript_id: "",
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
      title_id: item.title_id || "",
      transcript: item.transcript,
      transcript_id: item.transcript_id || "",
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
      updateMutation.mutate({ id: getId(editingItem), data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // ========== Simulation Logic ==========
  const openSimulation = (item: any) => {
    setSimItem(item)
    setSimPhase('idle')
    setSimHighlight(-1)
    setSimExpStep(0)
    setSimResults(null)
  }

  const closeSimulation = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current)
    setSimItem(null)
    setSimPhase('idle')
    setSimHighlight(-1)
    setSimResults(null)
  }

  const startListening = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current)
    
    const transcript = simItem?.transcript || ""
    const words = transcript.trim().split(/\s+/)
    if (words.length === 0 || !transcript) {
       setSimPhase('idle')
       return
    }

    const startHighlighter = () => {
      let i = 0
      const wpm = Math.max(1, simItem.target_wpm || 120)
      const msPerWord = 60000 / wpm
      
      simTimerRef.current = setInterval(() => {
        if (i >= words.length) {
          clearInterval(simTimerRef.current)
          setTimeout(() => setSimPhase('idle'), 600)
          return
        }
        setSimHighlight(i)
        i++
      }, msPerWord)
    }

    setSimPhase('listening')
    setSimHighlight(-1)

    // Play actual audio if available
    if (simItem?.audio_url) {
      const audio = new Audio(simItem.audio_url)
      audio.onplay = startHighlighter
      audio.play().catch(e => {
        console.error("Playback error:", e)
        startHighlighter()
      })
    } else {
      // Fallback to Browser TTS
      const utterance = new SpeechSynthesisUtterance(transcript)
      utterance.onstart = startHighlighter
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }

  const startRecording = async () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Determine supported mime type
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '' // Let browser decide
      }

      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || 'audio/wav'
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime })
        setSimPhase('analyzing')
        analyzeMutation.mutate({ 
          contentId: getId(simItem), 
          audioBlob 
        })
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setSimPhase('recording')
      setSimHighlight(-1)
    } catch (err) {
      console.error("Recording error:", err)
      alert("Could not access microphone. Please ensure you have granted permission.")
      setSimPhase('idle')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const startExpansionSim = () => {
    setSimPhase('listening')
    setSimExpStep(0)
    const steps = simItem.steps || []
    if (steps.length === 0) return
    let i = 0
    simTimerRef.current = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(simTimerRef.current)
        setSimPhase('results')
        const fluency = 60 + Math.random() * 35
        setSimResults({
          pace_wpm: (simItem.target_wpm || 120) * (0.8 + Math.random() * 0.3) | 0,
          pronunciation_score: (65 + Math.random() * 30) | 0,
          fluency_score: fluency | 0,
          hesitations: Math.floor(Math.random() * 3),
          steps_completed: steps.length,
          feedback: fluency > 75
            ? "Great sentence building! You expanded naturally. 🌟"
            : "Nice try! Work on connecting clauses more smoothly."
        })
        return
      }
      setSimExpStep(i)
      i++
    }, 2500)
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
            <div key={getId(item)} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all group relative">
               <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => openSimulation(item)}
                  className="p-2 bg-violet-50 text-violet-400 hover:text-violet-600 rounded-xl transition-colors border border-violet-100 hover:border-violet-200"
                  title="Simulate drill"
                >
                  <Play className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleEdit(item)}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors border border-slate-100 hover:border-blue-200"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm("Delete this drill?")) {
                      deleteMutation.mutate(getId(item))
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
                  {item.title_id && <p className="text-xs text-slate-500 font-medium">{item.title_id}</p>}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                <p className="text-slate-600 text-sm italic font-medium">"{item.transcript}"</p>
                {item.transcript_id && <p className="text-xs text-slate-400 mt-2 italic font-medium">({item.transcript_id})</p>}
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
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title (English)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input 
                        required
                        list="hospitality-topics"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
                        placeholder="Select or type..."
                      />
                      <datalist id="hospitality-topics">
                        {SUGGESTED_TOPICS.map(topic => (
                          <option key={topic} value={topic} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title (Indonesian)</label>
                  <input 
                    value={formData.title_id}
                    onChange={e => setFormData({...formData, title_id: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
                    placeholder="Translation..."
                  />
                </div>

                <div className="col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiMutation.isPending}
                    className={cn(
                      "px-8 py-3 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm shadow-sm",
                      aiMutation.isPending 
                        ? "bg-slate-100 text-slate-400 border-slate-200" 
                        : "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 shadow-amber-200/20"
                    )}
                  >
                    {aiMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {aiMutation.isPending ? "Generating Content..." : "Generate with AI Magic"}
                  </button>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Transcript (English)</label>
                    {aiMutation.isSuccess && (
                      <span className="text-[10px] font-bold text-green-500 flex items-center gap-1 animate-pulse">
                        <Check className="h-3 w-3" /> English Ready
                      </span>
                    )}
                  </div>
                  <textarea 
                    required
                    value={formData.transcript}
                    onChange={e => setFormData({...formData, transcript: e.target.value})}
                    className={cn(
                      "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[120px] font-medium text-slate-600 text-sm",
                      aiMutation.isSuccess ? "border-green-200 bg-green-50/10" : "border-slate-100"
                    )}
                    placeholder="English sentence..."
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Transcript (Indonesian)</label>
                    {aiMutation.isSuccess && (
                      <span className="text-[10px] font-bold text-green-500 flex items-center gap-1 animate-pulse">
                        <Check className="h-3 w-3" /> Translation Ready
                      </span>
                    )}
                  </div>
                  <textarea 
                    value={formData.transcript_id}
                    onChange={e => setFormData({...formData, transcript_id: e.target.value})}
                    className={cn(
                      "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[120px] font-medium text-slate-600 text-sm",
                      aiMutation.isSuccess ? "border-green-200 bg-green-50/10" : "border-slate-100"
                    )}
                    placeholder="Indonesian translation..."
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

      {/* ========== Simulation Modal ========== */}
      {simItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeSimulation} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 to-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white">
            {/* Header */}
            <div className="p-6 pb-4 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">
                  📱 Mobile Simulation
                </p>
                <h3 className="text-xl font-bold">{simItem.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{simItem.difficulty}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">{simItem.target_wpm} WPM</span>
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">{simItem.content_type}</span>
                </div>
              </div>
              <button onClick={closeSimulation} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Transcript with word highlighting */}
            <div className="px-6 pb-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                {simItem.content_type === 'shadowing' ? (
                  <p className="text-base leading-relaxed font-medium">
                    {simItem.transcript.split(/\s+/).map((word: string, i: number) => (
                      <span
                        key={i}
                        className={cn(
                          "transition-all duration-200 inline-block mr-1",
                          simHighlight === i
                            ? "text-amber-400 scale-110 font-bold"
                            : simHighlight > i
                            ? "text-green-400/80"
                            : "text-slate-300"
                        )}
                      >
                        {word}
                      </span>
                    ))}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(simItem.steps || []).map((step: string, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-3 py-2 px-3 rounded-xl transition-all duration-500",
                          simPhase === 'listening' && simExpStep === i
                            ? "bg-amber-500/20 border border-amber-500/30"
                            : simPhase === 'listening' && simExpStep > i
                            ? "bg-green-500/10 border border-green-500/20"
                            : "border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-all",
                          simPhase === 'listening' && simExpStep >= i ? "bg-green-500 text-white" : "bg-white/10 text-slate-500"
                        )}>
                          {i + 1}
                        </div>
                        <span className={cn(
                          "text-sm transition-colors",
                          simPhase === 'listening' && simExpStep === i ? "text-amber-300 font-bold" : "text-slate-300"
                        )}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Phase-specific UI */}
            <div className="px-6 pb-6">
              {simPhase === 'idle' && !simResults && (
                <div className="flex gap-3">
                  {simItem.content_type === 'shadowing' ? (
                    <>
                      <button onClick={startListening} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                        <Volume2 className="h-4 w-4" /> Listen
                      </button>
                      <button onClick={startRecording} className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                        <Mic className="h-4 w-4" /> Record
                      </button>
                    </>
                  ) : (
                    <button onClick={startExpansionSim} className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                      <Play className="h-4 w-4" /> Start Expansion Drill
                    </button>
                  )}
                </div>
              )}

              {simPhase === 'listening' && (
                <div className="text-center py-3">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-500/20 border border-blue-500/30 rounded-2xl">
                    <div className="flex gap-1">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className="w-1 bg-blue-400 rounded-full animate-pulse" style={{ height: `${10 + Math.random() * 14}px`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-blue-300 font-bold text-sm">Listening...</span>
                  </div>
                </div>
              )}

              {simPhase === 'recording' && (
                <div className="text-center py-3">
                  <button 
                    onClick={stopRecording}
                    className="inline-flex items-center gap-3 px-6 py-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl hover:bg-rose-500/30 transition-all cursor-pointer group animate-pulse"
                  >
                    <CircleStop className="h-5 w-5 text-rose-400 group-hover:scale-110 transition-transform" />
                    <span className="text-rose-300 font-bold text-sm">Stop Recording</span>
                    <div className="flex gap-0.5">
                      {[0,1,2,3,4,5].map(i => (
                        <div key={i} className="w-0.5 bg-rose-400 rounded-full animate-pulse" style={{ height: `${6 + Math.random() * 16}px`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  </button>
                </div>
              )}

              {simPhase === 'analyzing' && (
                <div className="text-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto mb-3" />
                  <p className="text-violet-300 font-bold text-sm">Analyzing fluency...</p>
                  <p className="text-slate-500 text-xs mt-1">Running pronunciation & pace engine</p>
                </div>
              )}

              {simPhase === 'results' && simResults && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  {/* Score rings */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Fluency', value: simResults.fluency_score, color: simResults.fluency_score > 70 ? 'text-green-400' : simResults.fluency_score > 50 ? 'text-amber-400' : 'text-rose-400', bg: simResults.fluency_score > 70 ? 'bg-green-500/10 border-green-500/20' : simResults.fluency_score > 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20' },
                      { label: 'Pronunciation', value: simResults.pronunciation_score, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                      { label: 'Pace', value: simResults.pace_wpm, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', suffix: ' wpm' },
                    ].map((s, i) => (
                      <div key={i} className={cn("rounded-2xl border p-4 text-center", s.bg)}>
                        <p className={cn("text-2xl font-black", s.color)}>{s.value}{s.suffix || '%'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Hesitations */}
                  <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <BarChart3 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300">
                      {Array.isArray(simResults.hesitations) ? simResults.hesitations.length : simResults.hesitations} hesitation{simResults.hesitations?.length !== 1 ? 's' : ''} detected
                    </span>
                  </div>

                  {/* Feedback */}
                  <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 rounded-2xl p-4">
                    <p className="text-sm text-slate-200 font-medium">{simResults.feedback_text || simResults.feedback}</p>
                  </div>

                  {/* Retry */}
                  <button
                    onClick={() => { setSimPhase('idle'); setSimResults(null); setSimHighlight(-1); }}
                    className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-white/10"
                  >
                    <RotateCcw className="h-4 w-4" /> Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
