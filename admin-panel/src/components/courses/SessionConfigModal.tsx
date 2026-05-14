import React, { useState, useEffect } from 'react'
import { X, Save, ArrowUp, ArrowDown, Settings2, Trash2, CheckCircle2, Circle, Gamepad2, MessageSquare, Languages, BookOpen, Sparkles, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLessonConfig, getLevelTemplate, upsertLessonConfig } from '../../services/api'
import { cn } from '../../lib/utils'

interface SessionConfigModalProps {
  isOpen: boolean
  onClose: () => void
  lessonId: string
  lessonTitle: string
  lessonLevel: string
}

export default function SessionConfigModal({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  lessonLevel
}: SessionConfigModalProps) {
  const queryClient = useQueryClient()
  const [phases, setPhases] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [activePhaseIdx, setActivePhaseIdx] = useState<number | null>(null)

  const { data: lessonConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['lessonSessionConfig', lessonId],
    queryFn: () => getLessonConfig(lessonId),
    enabled: isOpen && !!lessonId
  })

  const { data: levelTemplate } = useQuery({
    queryKey: ['levelTemplate', lessonLevel],
    queryFn: () => getLevelTemplate(lessonLevel),
    enabled: isOpen && !!lessonLevel
  })

  useEffect(() => {
    if (lessonConfig?.phases) {
      setPhases([...lessonConfig.phases].sort((a: any, b: any) => a.order - b.order))
    } else if (levelTemplate?.phases) {
      setPhases([...levelTemplate.phases].sort((a: any, b: any) => a.order - b.order))
    }
  }, [lessonConfig, levelTemplate, isOpen])

  const upsertMutation = useMutation({
    mutationFn: (data: any) => upsertLessonConfig(lessonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonSessionConfig', lessonId] })
      onClose()
    }
  })

  const handleTogglePhase = (idx: number) => {
    const newPhases = [...phases]
    newPhases[idx].enabled = !newPhases[idx].enabled
    setPhases(newPhases)
  }

  const handleMove = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === phases.length - 1) return

    const newPhases = [...phases]
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    
    // Swap
    const temp = newPhases[idx]
    newPhases[idx] = newPhases[targetIdx]
    newPhases[targetIdx] = temp

    // Update order
    newPhases.forEach((p, i) => p.order = i + 1)
    setPhases(newPhases)
  }

  const handleUpdateSettings = (idx: number, field: string, value: any) => {
    const newPhases = [...phases]
    if (!newPhases[idx].settings) newPhases[idx].settings = {}
    newPhases[idx].settings[field] = value
    setPhases(newPhases)
  }

  const handleSave = async () => {
    // Validation
    for (const phase of phases) {
      if (phase.phase_type === 'vocab_drill') {
        const count = phase.settings?.max_drill_count;
        if (count !== undefined && (isNaN(count) || count < 1)) {
          alert('Max Rounds must be at least 1.');
          return;
        }
      }
      if (phase.phase_type === 'pronunciation') {
        const count = phase.settings?.sentence_count;
        const acc = phase.settings?.min_accuracy_score;
        if (count !== undefined && (isNaN(count) || count < 1)) {
          alert('Sentence Count must be at least 1.');
          return;
        }
        if (acc !== undefined && (isNaN(acc) || acc < 0 || acc > 100)) {
          alert('Min Accuracy must be between 0 and 100.');
          return;
        }
      }
      if (phase.phase_type === 'conversation') {
        const turns = phase.settings?.turn_count;
        if (turns !== undefined && (isNaN(turns) || turns < 1)) {
          alert('Turns must be at least 1.');
          return;
        }
      }
    }

    setIsSaving(true)
    try {
      await upsertMutation.mutateAsync({ phases })
    } finally {
      setIsSaving(false)
    }
  }

  const getPhaseIcon = (type: string) => {
    switch (type) {
      case 'read': return <BookOpen className="h-4 w-4" />
      case 'flashcard': return <Languages className="h-4 w-4" />
      case 'vocab_drill': return <Sparkles className="h-4 w-4" />
      case 'game': return <Gamepad2 className="h-4 w-4" />
      case 'pronunciation': return <Activity className="h-4 w-4" />
      case 'conversation': return <MessageSquare className="h-4 w-4" />
      default: return <Settings2 className="h-4 w-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Settings2 className="h-6 w-6 text-blue-600" />
              Session Configuration
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Customizing flow for: <span className="text-blue-600 font-bold">{lessonTitle}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Phases List */}
          <div className="w-full md:w-2/5 border-r border-slate-100 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Learning Steps</span>
              <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">{phases.length} Phases</span>
            </div>
            
            {isLoadingConfig ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">Loading config...</span>
              </div>
            ) : (
              phases.map((phase, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActivePhaseIdx(idx)}
                  className={cn(
                    "group relative p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center",
                    activePhaseIdx === idx ? "bg-white border-blue-200 shadow-md ring-2 ring-blue-500/10 scale-[1.02] z-10" : "bg-white border-slate-100 hover:border-slate-200",
                    !phase.enabled && "opacity-60 grayscale-[0.5]"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors",
                    phase.enabled ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {phase.order}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getPhaseIcon(phase.phase_type)}
                      <h4 className="font-bold text-slate-800 capitalize truncate text-sm">
                        {phase.phase_type.replace('_', ' ')}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }}
                      disabled={idx === 0}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }}
                      disabled={idx === phases.length - 1}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleTogglePhase(idx); }}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        phase.enabled ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-100"
                      )}
                    >
                      {phase.enabled ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Phase Editor */}
          <div className="flex-1 overflow-y-auto p-8 bg-white">
            {activePhaseIdx !== null ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-black text-slate-800 capitalize">
                      {phases[activePhaseIdx].phase_type.replace('_', ' ')} Settings
                    </h4>
                    <p className="text-sm text-slate-400 font-medium">Customize how students interact with this step</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    {getPhaseIcon(phases[activePhaseIdx].phase_type)}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Common Settings could go here if any */}

                  {/* Type Specific Settings */}
                  {phases[activePhaseIdx].phase_type === 'flashcard' && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">Audio Feedback</label>
                        <div 
                          onClick={() => handleUpdateSettings(activePhaseIdx, 'auto_play_audio', !phases[activePhaseIdx].settings?.auto_play_audio)}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between",
                            phases[activePhaseIdx].settings?.auto_play_audio ? "border-blue-500 bg-blue-50/30" : "border-slate-100"
                          )}
                        >
                          <span className="text-sm font-bold">Auto-play TTS</span>
                          <CheckCircle2 className={cn("h-5 w-5", phases[activePhaseIdx].settings?.auto_play_audio ? "text-blue-500" : "text-slate-200")} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">Translation</label>
                        <div 
                          onClick={() => handleUpdateSettings(activePhaseIdx, 'show_translation', !phases[activePhaseIdx].settings?.show_translation)}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between",
                            phases[activePhaseIdx].settings?.show_translation ? "border-blue-500 bg-blue-50/30" : "border-slate-100"
                          )}
                        >
                          <span className="text-sm font-bold">Show Bahasa</span>
                          <CheckCircle2 className={cn("h-5 w-5", phases[activePhaseIdx].settings?.show_translation ? "text-blue-500" : "text-slate-200")} />
                        </div>
                      </div>
                    </div>
                  )}

                  {phases[activePhaseIdx].phase_type === 'vocab_drill' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Max Rounds</label>
                        <input 
                          type="number"
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold"
                          value={phases[activePhaseIdx].settings?.max_drill_count || 5}
                          onChange={(e) => handleUpdateSettings(activePhaseIdx, 'max_drill_count', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Drill Types</label>
                        <div className="flex flex-wrap gap-2">
                          {['matching', 'fill_in_the_blank', 'word_scramble', 'listening'].map(type => {
                            const current = phases[activePhaseIdx].settings?.drill_types || []
                            const isActive = current.includes(type)
                            return (
                              <button
                                key={type}
                                onClick={() => {
                                  const next = isActive ? current.filter((t: string) => t !== type) : [...current, type]
                                  handleUpdateSettings(activePhaseIdx, 'drill_types', next)
                                }}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all capitalize",
                                  isActive ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" : "border-slate-100 text-slate-400 hover:border-slate-200"
                                )}
                              >
                                {type.replace(/_/g, ' ')}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {phases[activePhaseIdx].phase_type === 'game' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Difficulty</label>
                        <div className="grid grid-cols-3 gap-3">
                          {['easy', 'medium', 'hard'].map(level => (
                            <button
                              key={level}
                              onClick={() => handleUpdateSettings(activePhaseIdx, 'difficulty', level)}
                              className={cn(
                                "py-3 rounded-xl text-xs font-bold border-2 transition-all capitalize",
                                (phases[activePhaseIdx].settings?.difficulty || 'medium') === level ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-100 text-slate-400"
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Game Types Selection */}
                    </div>
                  )}

                  {phases[activePhaseIdx].phase_type === 'pronunciation' && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Sentence Count</label>
                        <input 
                          type="number"
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold"
                          value={phases[activePhaseIdx].settings?.sentence_count || 3}
                          onChange={(e) => handleUpdateSettings(activePhaseIdx, 'sentence_count', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Min Accuracy (%)</label>
                        <input 
                          type="number"
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold"
                          value={phases[activePhaseIdx].settings?.min_accuracy_score || 80}
                          onChange={(e) => handleUpdateSettings(activePhaseIdx, 'min_accuracy_score', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  )}

                  {phases[activePhaseIdx].phase_type === 'conversation' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Turns</label>
                        <input 
                          type="number"
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all font-bold"
                          value={phases[activePhaseIdx].settings?.turn_count || 5}
                          onChange={(e) => handleUpdateSettings(activePhaseIdx, 'turn_count', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Scenario Override Context</label>
                        <textarea 
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all text-sm min-h-[100px]"
                          value={phases[activePhaseIdx].settings?.scenario_context || ''}
                          onChange={(e) => handleUpdateSettings(activePhaseIdx, 'scenario_context', e.target.value)}
                          placeholder="Override the AI context for this conversation..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-300">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Settings2 className="h-10 w-10" />
                </div>
                <h4 className="text-lg font-bold text-slate-400">Select a phase to customize</h4>
                <p className="text-sm max-w-xs mt-2">Adjust orders, toggle visibility, and configure specific behavior for each learning step.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex gap-4">
            <button 
              onClick={() => {
                if (window.confirm("Reset to level defaults? This will erase lesson-specific overrides.")) {
                  setPhases([...(levelTemplate?.phases || [])].sort((a, b) => a.order - b.order))
                }
              }}
              className="px-6 py-2.5 text-rose-600 font-bold text-sm hover:bg-rose-50 rounded-2xl transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-200 transition-all disabled:opacity-50 transform active:scale-95"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Session Config
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Activity({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
