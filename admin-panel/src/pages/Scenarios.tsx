import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, BrainCircuit, Play, Settings2, X, Send, Target, MessageSquare, Info, Users, Sparkles, Loader2, Trash2, Bot, User as UserIcon } from "lucide-react"
import { getSpeakingScenarios, createSpeakingScenario, updateSpeakingScenario, deleteSpeakingScenario, aiGenerateSpeakingScenario, startSpeakingTest, sendSpeakingTestTurn } from "../services/api"

export default function Scenarios() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingScenario, setEditingScenario] = useState<any>(null)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testSession, setTestSession] = useState<any>(null)
  const [testMessages, setTestMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    role_ai: "Guest",
    role_user: "Receptionist",
    initial_message: "",
    context: "",
    target_vocabulary: "",
    level: "A1"
  })

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ['speaking-scenarios'],
    queryFn: getSpeakingScenarios,
  })

  // Helper to handle MongoDB _id which might be an object {$oid: "..."} or a string
  const getScenarioId = (scenario: any) => {
    if (!scenario?._id) return ""
    return typeof scenario._id === 'object' ? scenario._id.$oid : scenario._id
  }

  const createMutation = useMutation({
    mutationFn: createSpeakingScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speaking-scenarios'] })
      closeModal()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateSpeakingScenario(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speaking-scenarios'] })
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSpeakingScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speaking-scenarios'] })
      closeModal()
    }
  })

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingScenario(null)
    setFormData({
      title: "",
      description: "",
      role_ai: "Guest",
      role_user: "Receptionist",
      initial_message: "",
      context: "",
      target_vocabulary: "",
      level: "A1"
    })
  }

  const handleEdit = (scenario: any) => {
    setEditingScenario(scenario)
    setFormData({
      title: scenario.title,
      description: scenario.description,
      role_ai: scenario.role_ai,
      role_user: scenario.role_user,
      initial_message: scenario.initial_message,
      context: scenario.context,
      target_vocabulary: Array.isArray(scenario.target_vocabulary) 
        ? scenario.target_vocabulary.join(', ') 
        : scenario.target_vocabulary || "",
      level: scenario.level
    })
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      target_vocabulary: formData.target_vocabulary.split(',').map(s => s.trim()).filter(Boolean)
    }
    
    if (editingScenario) {
      updateMutation.mutate({ id: getScenarioId(editingScenario), data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const aiGenerateMutation = useMutation({
    mutationFn: aiGenerateSpeakingScenario,
    onSuccess: (data: any) => {
      setFormData({
        ...formData,
        title: data.title,
        description: data.description,
        role_ai: data.role_ai,
        role_user: data.role_user,
        initial_message: data.initial_message,
        context: data.context,
        target_vocabulary: data.target_vocabulary.join(', ')
      })
    }
  })

  const startTestMutation = useMutation({
    mutationFn: startSpeakingTest,
    onSuccess: (session: any) => {
      setTestSession(session)
      setTestMessages(session.turns)
      setIsTestModalOpen(true)
    }
  })

  const sendTurnMutation = useMutation({
    mutationFn: ({ sessionId, text }: { sessionId: string; text: string }) => sendSpeakingTestTurn(sessionId, text),
    onSuccess: (data: any) => {
      setTestMessages(prev => [
        ...prev, 
        { role: 'user', content: inputText, evaluation: data.evaluation },
        { role: 'ai', content: data.response_text }
      ])
      setInputText("")
    }
  })

  const handleStartTest = (scenarioId: string) => {
    startTestMutation.mutate(scenarioId)
  }

  const handleSendTestMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || sendTurnMutation.isPending) return
    sendTurnMutation.mutate({ sessionId: getScenarioId(testSession), text: inputText })
  }

  const handleAiGenerate = () => {
    if (!formData.title) {
      alert("Please enter a basic topic or title first so the AI knows what to generate!")
      return
    }
    aiGenerateMutation.mutate({ topic: formData.title, level: formData.level })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">AI Speaking Scenarios</h2>
          <p className="text-slate-500 text-sm mt-1">Manage interactive roleplay scenarios for hospitality training.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-all shadow-indigo-600/20 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Scenario
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {scenarios?.map((item: any) => (
            <div key={getScenarioId(item)} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(item)}
                  className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-full shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-start mb-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4">
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    item.level === 'A1' ? 'bg-emerald-50 text-emerald-700' : 
                    item.level === 'B2' ? 'bg-amber-50 text-amber-700' : 
                    'bg-rose-50 text-rose-700'
                  }`}>
                    {item.level}
                  </span>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>
                </div>
              </div>

              <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                {item.description}
              </p>
              
              <div className="flex items-center justify-between mt-6">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600" title={item.role_ai}>AI</div>
                  <div className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600" title={item.role_user}>U</div>
                </div>
                
                <button 
                  onClick={() => handleStartTest(getScenarioId(item))}
                  disabled={startTestMutation.isPending}
                  className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  {startTestMutation.isPending && startTestMutation.variables === getScenarioId(item) ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="mr-1 h-3.5 w-3.5" />
                  )}
                  Test Scenario
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal (Standard React/Tailwind Implementation) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {editingScenario ? 'Edit Scenario' : 'New Speaking Scenario'}
                </h3>
                <p className="text-sm text-slate-500">
                  {editingScenario ? 'Refine the details of this practice session.' : 'Configure a new AI practice scenario.'}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Scenario Title / Topic</label>
                    <div className="flex gap-2">
                      <input 
                        required
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder="e.g. Checking in late at night"
                      />
                      <button
                        type="button"
                        onClick={handleAiGenerate}
                        disabled={aiGenerateMutation.isPending}
                        className="px-4 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all flex items-center gap-2 font-bold text-sm whitespace-nowrap"
                      >
                        {aiGenerateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        AI Generate
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Short Description</label>
                    <input 
                      required
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      placeholder="What should the student learn here?"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" /> AI Role
                    </label>
                    <input 
                      required
                      value={formData.role_ai}
                      onChange={e => setFormData({...formData, role_ai: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      placeholder="e.g. Angry Guest"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="h-3 w-3" /> User Role
                    </label>
                    <input 
                      required
                      value={formData.role_user}
                      onChange={e => setFormData({...formData, role_user: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      placeholder="e.g. Receptionist"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Send className="h-3 w-3" /> AI Initial Message
                  </label>
                  <textarea 
                    required
                    value={formData.initial_message}
                    onChange={e => setFormData({...formData, initial_message: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all min-h-[80px]"
                    placeholder="The very first line the AI says to start the practice..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Info className="h-3 w-3" /> AI System Context (Hidden)
                  </label>
                  <textarea 
                    required
                    value={formData.context}
                    onChange={e => setFormData({...formData, context: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all min-h-[100px]"
                    placeholder="Instructions for the AI: how should it behave? What is the secret goal? e.g. 'You are a guest who lost their luggage and you are very upset...'"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Target className="h-3 w-3" /> Target Vocabulary (Comma separated)
                    </label>
                    <input 
                      value={formData.target_vocabulary}
                      onChange={e => setFormData({...formData, target_vocabulary: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      placeholder="reservation, welcome, apologize..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Level</label>
                    <select 
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="A1">A1 - Beginner</option>
                      <option value="A2">A2 - Elementary</option>
                      <option value="B1">B1 - Intermediate</option>
                      <option value="B2">B2 - Upper Int</option>
                      <option value="C1">C1 - Advanced</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                {editingScenario && (
                  <button 
                    type="button"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this scenario?")) {
                        deleteMutation.mutate(getScenarioId(editingScenario))
                      }
                    }}
                    className="px-4 py-3 bg-rose-50 text-rose-600 font-bold rounded-2xl hover:bg-rose-100 transition-colors flex items-center justify-center"
                    title="Delete Scenario"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-[2] px-4 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>{editingScenario ? 'Save Changes' : 'Create Practice Scenario'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Modal (Slide-over / Modal for testing the AI) */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-end p-4 sm:p-6 overflow-hidden">
          <div 
            onClick={() => setIsTestModalOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
          />
          
          <div className="relative w-full max-w-md h-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Testing Scenario</h3>
                  <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Live Interaction</p>
                </div>
              </div>
              <button onClick={() => setIsTestModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {testMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-slate-200 text-slate-600'
                    }`}>
                      {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      
                      {msg.evaluation && (
                        <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-700">
                          <div className="font-bold mb-1 flex justify-between">
                            <span>AI Feedback:</span>
                            <span>Score: {msg.evaluation.score}/100</span>
                          </div>
                          <p className="italic">"{msg.evaluation.feedback}"</p>
                          <div className="mt-1 font-bold">Try: <span className="text-emerald-800">"{msg.evaluation.better_answer}"</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {sendTurnMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400 font-medium">AI is typing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <form onSubmit={handleSendTestMessage} className="relative">
                <input 
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type your response as a staff member..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim() || sendTurnMutation.isPending}
                  className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                This is a test environment. Interactions are not saved to analytics.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
