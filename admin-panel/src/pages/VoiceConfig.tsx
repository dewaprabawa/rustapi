import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Mic, Volume2, Save, Loader2, Sparkles, Check, Play, Pause } from "lucide-react"
import { cn } from "../lib/utils"
import { getVoiceConfig, updateVoiceConfig, testTts } from "../services/api"

export default function VoiceConfig() {
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

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
      setAudioUrl(url)
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
    return <div className="flex justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Volume2 className="h-6 w-6 text-indigo-500" />
            Voice Abstraction Layer
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Configure STT (Speech-to-Text) and TTS (Text-to-Speech) providers for the speaking engine.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STT Config */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Speech-to-Text (STT)</h3>
              <p className="text-xs text-slate-500">Used for learner pronunciation</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Active Provider</label>
            <select
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/30"
              value={formData.stt_provider}
              onChange={e => setFormData({ ...formData, stt_provider: e.target.value })}
            >
              <option value="deepgram">Deepgram Nova-2 (Default)</option>
              <option value="whisper">OpenAI Whisper (Fallback)</option>
              <option value="gcp">Google Cloud STT</option>
              <option value="persona_plex" disabled>PersonaPlex (Coming Soon)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Provider API Key</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 font-mono"
              placeholder="Deepgram / OpenAI API Key..."
              value={formData.deepgram_api_key}
              onChange={e => setFormData({ ...formData, deepgram_api_key: e.target.value })}
            />
          </div>
        </div>

        {/* TTS Config */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Text-to-Speech (TTS)</h3>
              <p className="text-xs text-slate-500">Used for the AI Coach responses</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Active Provider</label>
            <select
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/30"
              value={formData.tts_provider}
              onChange={e => setFormData({ ...formData, tts_provider: e.target.value })}
            >
              <option value="elevenlabs">ElevenLabs (Default)</option>
              <option value="gcp">Google Cloud TTS</option>
              <option value="persona_plex" disabled>PersonaPlex (Coming Soon)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Provider API Key</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 font-mono"
              placeholder="ElevenLabs API Key..."
              value={formData.elevenlabs_api_key}
              onChange={e => setFormData({ ...formData, elevenlabs_api_key: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Default Voice ID</label>
            <input
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 font-mono"
              placeholder="e.g. ErXwobaYiN019PkySvjV"
              value={formData.elevenlabs_voice_id}
              onChange={e => setFormData({ ...formData, elevenlabs_voice_id: e.target.value })}
            />
          </div>
        </div>

        {/* Global Config */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col space-y-4">
          <h3 className="font-semibold text-slate-800">Test Configuration</h3>
          <div className="flex gap-4 items-center">
            <textarea
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 min-h-[80px]"
              value={testText}
              onChange={e => setTestText(e.target.value)}
              placeholder="Type something to test TTS..."
            />
            <button
              onClick={handleTestTts}
              disabled={testTtsMutation.isPending || isPlaying}
              className="shrink-0 flex items-center justify-center h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 hover:scale-105 transition-all"
            >
              {testTtsMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : 
               isPlaying ? <Volume2 className="h-6 w-6 animate-pulse" /> : 
               <Play className="h-6 w-6 ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
