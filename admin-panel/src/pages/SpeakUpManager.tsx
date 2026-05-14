import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getSpeakUpContent, 
  createSpeakUpContent, 
  updateSpeakUpContent, 
  deleteSpeakUpContent, 
  aiGenerateSpeakUp, 
  analyzeSpeakUpTest, 
  testSpeakUpListen, 
  getMasterData 
} from "../services/api"
import { getId, formatError } from "../lib/utils"

// Sub-components
import { SpeakUpHeader } from "../components/speakup/SpeakUpHeader"
import { DrillList } from "../components/speakup/DrillList"
import { CoachSim } from "../components/speakup/CoachSim"
import { DrillModal } from "../components/speakup/DrillModal"

export default function SpeakUpManager() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"shadowing" | "expansion">("shadowing")
  const [hospitalityTopics, setHospitalityTopics] = useState<string[]>([])

  useEffect(() => {
    getMasterData("hospitality_topics")
      .then(data => {
        if (data?.options) setHospitalityTopics(data.options)
      })
      .catch(console.error)
  }, [])

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
    steps: ""
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

  const startListening = async () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current)
    
    const transcript = simItem?.transcript || ""
    const words = transcript.trim().split(/\s+/)
    if (words.length === 0 || !transcript) {
       setSimPhase('idle')
       return
    }

    setSimPhase('listening')
    setSimHighlight(-1)

    const startHighlighter = () => {
      let i = 0
      const wpm = Math.max(1, simItem.target_wpm || 120)
      const msPerWord = 60000 / wpm
      
      simTimerRef.current = setInterval(() => {
        if (i >= words.length) {
          clearInterval(simTimerRef.current)
          setTimeout(() => setSimPhase('idle'), 1000)
          return
        }
        setSimHighlight(i)
        i++
      }, msPerWord)
    }

    try {
      const audioBlob = await testSpeakUpListen({ 
        content_id: getId(simItem),
        step_index: simItem.content_type === 'expansion' ? simExpStep : undefined
      })
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audio.onplay = startHighlighter
      audio.play().catch(e => {
        console.error("Playback error:", e)
        startHighlighter()
      })
    } catch (err) {
      console.warn("Backend TTS failed, falling back to browser TTS:", err)
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
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/ogg'
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = ''

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || 'audio/wav'
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime })
        setSimPhase('analyzing')
        analyzeMutation.mutate({ contentId: getId(simItem), audioBlob })
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
          feedback: fluency > 75 ? "Great sentence building! You expanded naturally. 🌟" : "Nice try! Work on connecting clauses more smoothly."
        })
        return
      }
      setSimExpStep(i)
      i++
    }, 2500)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SpeakUpHeader 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddClick={() => {
          setFormData({...formData, content_type: activeTab});
          setIsModalOpen(true);
        }}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <DrillList 
          filteredContents={filteredContents}
          activeTab={activeTab}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          onSimulate={openSimulation}
          onAddFirst={() => setIsModalOpen(true)}
        />
      )}

      <CoachSim 
        simItem={simItem}
        simPhase={simPhase}
        simHighlight={simHighlight}
        simExpStep={simExpStep}
        simResults={simResults}
        onClose={closeSimulation}
        onListen={startListening}
        onRecord={startRecording}
        onStopRecording={stopRecording}
        onStartExpansion={startExpansionSim}
        onTryAgain={() => {
          setSimPhase('idle');
          setSimResults(null);
          setSimHighlight(-1);
        }}
      />

      <DrillModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        editingItem={editingItem}
        activeTab={activeTab}
        formData={formData}
        setFormData={setFormData}
        hospitalityTopics={hospitalityTopics}
        onAiGenerate={handleAiGenerate}
        isAiGenerating={aiMutation.isPending}
        isAiSuccess={aiMutation.isSuccess}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
