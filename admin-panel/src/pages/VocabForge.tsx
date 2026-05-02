import React, { useState, useEffect } from 'react'
import { Sparkles, Loader2, Plus, Search, BookOpen, Trash2, ChevronRight, Globe, Volume2, Save, X, Edit3, MessageSquare } from 'lucide-react'
import { cn } from '../lib/utils'
import { generateVocabSet, saveVocabSet, getVocabSets, getVocabSetWords, getConversationRequests, generateConversationScenario } from '../services/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface GeneratedWord {
  word: string
  translation: string
  part_of_speech: string
  definition: string
  pronunciation_guide: string
  colloquial_usage: string
  example_sentence: string
  distractors: string[]
}

interface VocabPreview {
  title: string
  title_id: string
  words: GeneratedWord[]
  related_topics: string[]
}

interface VocabSet {
  _id: string
  title: string
  topic: string
  level: string
  language: string
  word_count: number
  status: string
  created_at: string
}

interface TargetWord {
  _id: string
  word: string
  translation: string
}

interface ConversationRequest {
  _id: string
  user_id: string
  context_note: string
  status: string
  target_words: TargetWord[]
  created_at: any
  resolved_at?: any
}

export default function VocabForge() {
  const queryClient = useQueryClient()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'library' | 'requests'>('library')
  const [selectedSet, setSelectedSet] = useState<VocabSet | null>(null)
  const [selectedWords, setSelectedWords] = useState<GeneratedWord[]>([])
  
  const [builderForm, setBuilderForm] = useState({
    topic: '',
    level: 'B1',
    word_count: 10,
    language: 'Indonesian'
  })

  const [previewData, setPreviewData] = useState<VocabPreview | null>(null)
  const [creditMeta, setCreditMeta] = useState<any>(null)

  // Queries
  const { data: vocabSets = [], isLoading: isLoadingSets } = useQuery({
    queryKey: ['vocabSets'],
    queryFn: getVocabSets
  })

  const { data: conversationRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['conversationRequests'],
    queryFn: getConversationRequests
  })

  // Mutations
  const generateMutation = useMutation({
    mutationFn: generateVocabSet,
    onSuccess: (data: any) => {
      // Backend returns { preview: {...}, _meta: {...} }
      setPreviewData(data.preview)
      setCreditMeta(data._meta)
      setIsGenerating(false)
      setIsPreviewOpen(true)
      setIsBuilderOpen(false)
    },
    onError: (err: any) => {
      setIsGenerating(false)
      const msg = err?.response?.data?.message || "Failed to generate vocabulary. Please try again."
      alert(msg)
    }
  })

  const saveMutation = useMutation({
    mutationFn: saveVocabSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabSets'] })
      setIsPreviewOpen(false)
      setPreviewData(null)
      alert("Vocab set saved successfully!")
    },
    onError: () => {
      alert("Failed to save vocab set.")
    }
  })

  const generateScenarioMutation = useMutation({
    mutationFn: generateConversationScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversationRequests'] })
      alert("Practice scenario generated successfully!")
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to generate scenario."
      alert(msg)
    }
  })

  const handleGenerate = () => {
    setIsGenerating(true)
    generateMutation.mutate(builderForm)
  }

  const handleSave = () => {
    if (!previewData) return
    saveMutation.mutate({
      preview: previewData,
      level: builderForm.level,
      language: builderForm.language,
      topic: builderForm.topic
    })
  }

  const openSetDetails = async (set: VocabSet) => {
    setSelectedSet(set)
    try {
      const words = await getVocabSetWords(set._id)
      setSelectedWords(words)
    } catch (error) {
      console.error("Failed to fetch words", error)
    }
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">VocabForge AI</h2>
          <p className="text-slate-500 mt-1">Generate and manage high-quality vocabulary sets for hospitality training.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('library')}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                activeTab === 'library' 
                  ? "bg-white text-slate-800 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Library
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                activeTab === 'requests' 
                  ? "bg-white text-slate-800 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Student Requests
              {conversationRequests.filter((r: any) => r.status === 'pending').length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {conversationRequests.filter((r: any) => r.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
          <button 
            onClick={() => setIsBuilderOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="h-5 w-5" />
            Generate New Set
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      {activeTab === 'library' ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Set List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Vocabulary Library</h3>
              <span className="px-2.5 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                {vocabSets.length} Sets
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingSets ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Loading library...</p>
                </div>
              ) : vocabSets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 px-8 text-center">
                  <BookOpen className="h-12 w-12 opacity-20" />
                  <p className="text-sm">No vocabulary sets found. Click "Generate New Set" to begin.</p>
                </div>
              ) : (
                vocabSets.map((set: VocabSet) => (
                  <button
                    key={set._id}
                    onClick={() => openSetDetails(set)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all duration-200 group",
                      selectedSet?._id === set._id 
                        ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100" 
                        : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-tight",
                        set.level.startsWith('A') ? "bg-emerald-100 text-emerald-700" :
                        set.level.startsWith('B') ? "bg-amber-100 text-amber-700" :
                        "bg-rose-100 text-rose-700"
                      )}>
                        {set.level}
                      </span>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform group-hover:translate-x-0.5",
                        selectedSet?._id === set._id ? "text-blue-500" : "text-slate-300"
                      )} />
                    </div>
                    <h4 className="font-bold text-slate-800 line-clamp-1">{set.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {set.topic} • {set.word_count} words
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Set Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
            {selectedSet ? (
              <>
                <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-slate-800">{selectedSet.title}</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                          {selectedSet.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-slate-400" /> {selectedSet.language}</span>
                        <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-slate-400" /> {selectedSet.level}</span>
                        <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-slate-400" /> {selectedSet.topic}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedWords.map((word, idx) => (
                      <div key={idx} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                              {word.word}
                              <span className="text-xs font-normal text-slate-400">({word.part_of_speech})</span>
                            </h5>
                            <p className="text-blue-600 font-medium">{word.translation}</p>
                          </div>
                          <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                            <Volume2 className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <div className="flex items-start gap-2">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase mt-0.5">IPA</span>
                            <p className="text-xs text-slate-600 italic">{word.pronunciation_guide}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 text-[10px] font-bold rounded uppercase mt-0.5">SPOKEN</span>
                            <p className="text-xs text-slate-600 leading-relaxed">{word.colloquial_usage}</p>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-500 italic">"{word.example_sentence}"</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 p-12 text-center">
                <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Search className="h-12 w-12 opacity-20" />
                </div>
                <h4 className="text-xl font-bold text-slate-400">Select a set to view details</h4>
                <p className="text-sm mt-2 max-w-xs">Review the vocabulary, translations, and AI-generated speaking contexts.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Student Practice Requests</h3>
            <span className="px-2.5 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
              {conversationRequests.length} Total
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoadingRequests ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading requests...</p>
              </div>
            ) : conversationRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 px-8 text-center">
                <MessageSquare className="h-12 w-12 opacity-20" />
                <p className="text-sm">No student practice requests found.</p>
              </div>
            ) : (
              conversationRequests.map((req: ConversationRequest) => (
                <div key={req._id} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          req.status === 'pending' ? "bg-amber-100 text-amber-700" :
                          req.status === 'generated' ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {req.status}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">User: {req.user_id.substring(0,8)}...</span>
                      </div>
                      <p className="text-slate-800 font-medium italic">"{req.context_note}"</p>
                    </div>
                    {req.status === 'pending' && (
                      <button 
                        onClick={() => generateScenarioMutation.mutate(req._id)}
                        disabled={generateScenarioMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                      >
                        {generateScenarioMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Generate Practice
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3" /> Target Vocabulary ({req.target_words.length} words)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {req.target_words.map((tw: TargetWord) => (
                        <div key={tw._id} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm flex gap-2 items-center shadow-sm">
                          <span className="font-bold text-slate-700">{tw.word}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-blue-600 font-medium text-xs">{tw.translation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Generator Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">VocabForge Builder</h3>
                <p className="text-xs text-slate-500">Configure your AI vocabulary generation parameters.</p>
              </div>
              <button onClick={() => setIsBuilderOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white border border-slate-100 rounded-xl transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Target Topic</label>
                  <input 
                    type="text"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none placeholder:text-slate-400"
                    placeholder="e.g. Front Desk Check-in, Housekeeping Tools..."
                    value={builderForm.topic}
                    onChange={e => setBuilderForm({...builderForm, topic: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">CEFR Level</label>
                    <select 
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                      value={builderForm.level}
                      onChange={e => setBuilderForm({...builderForm, level: e.target.value})}
                    >
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                        <option key={lvl} value={lvl}>{lvl} - {lvl === 'A1' ? 'Beginner' : lvl === 'B1' ? 'Intermediate' : 'Advanced'}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Word Count</label>
                    <input 
                      type="number"
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                      value={builderForm.word_count}
                      onChange={e => setBuilderForm({...builderForm, word_count: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Target Language</label>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-bold text-blue-800">Indonesian (Bilingual Mode)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={!builderForm.topic || isGenerating}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating with Claude AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Vocabulary
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-800">AI Preview: {previewData.title}</h3>
                {previewData.title_id && <p className="text-sm text-blue-600 font-medium">{previewData.title_id}</p>}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <p className="text-xs text-slate-500">Review and edit before saving.</p>
                  {creditMeta && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      creditMeta.warning_level === 'critical' ? 'bg-red-100 text-red-700' :
                      creditMeta.warning_level === 'caution' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    )}>
                      {creditMeta.daily_remaining} credits left • ${creditMeta.estimated_cost_usd}
                    </span>
                  )}
                </div>
                {previewData.related_topics?.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Related:</span>
                    {previewData.related_topics.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save to Library
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {previewData.words.map((word, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <input 
                          className="font-bold text-slate-800 text-xl bg-transparent border-none focus:ring-0 p-0 w-full"
                          value={word.word}
                          onChange={e => {
                            const newWords = [...previewData.words]
                            newWords[idx].word = e.target.value
                            setPreviewData({...previewData, words: newWords})
                          }}
                        />
                        <input 
                          className="text-blue-600 font-bold bg-transparent border-none focus:ring-0 p-0 w-full text-sm"
                          value={word.translation}
                          onChange={e => {
                            const newWords = [...previewData.words]
                            newWords[idx].translation = e.target.value
                            setPreviewData({...previewData, words: newWords})
                          }}
                        />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-300 hover:text-slate-600"><Edit3 className="h-4 w-4" /></button>
                        <button className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phonetics</label>
                        <input 
                          className="w-full text-xs text-slate-600 italic bg-slate-50 border-none rounded-lg px-2 py-1"
                          value={word.pronunciation_guide}
                          onChange={e => {
                            const newWords = [...previewData.words]
                            newWords[idx].pronunciation_guide = e.target.value
                            setPreviewData({...previewData, words: newWords})
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Part of Speech</label>
                        <input 
                          className="w-full text-xs text-slate-600 bg-slate-50 border-none rounded-lg px-2 py-1"
                          value={word.part_of_speech}
                          onChange={e => {
                            const newWords = [...previewData.words]
                            newWords[idx].part_of_speech = e.target.value
                            setPreviewData({...previewData, words: newWords})
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Natural Spoken Usage</label>
                        <textarea 
                          className="w-full text-xs text-slate-600 leading-relaxed bg-indigo-50/30 border-none rounded-xl px-3 py-2 min-h-[60px] resize-none mt-1"
                          value={word.colloquial_usage}
                          onChange={e => {
                            const newWords = [...previewData.words]
                            newWords[idx].colloquial_usage = e.target.value
                            setPreviewData({...previewData, words: newWords})
                          }}
                        />
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Conversational Example</label>
                        <textarea 
                          className="w-full text-xs text-slate-600 italic bg-white border border-slate-100 rounded-lg px-3 py-2 min-h-[50px] resize-none"
                          value={word.example_sentence}
                          onChange={e => {
                            const newWords = [...previewData.words]
                            newWords[idx].example_sentence = e.target.value
                            setPreviewData({...previewData, words: newWords})
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
