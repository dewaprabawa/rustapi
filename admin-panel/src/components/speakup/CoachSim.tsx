import React from 'react'
import { X, Volume2, Mic, Play, CircleStop, Loader2, BarChart3, Target, Sparkles, RotateCcw, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CoachSimProps {
  simItem: any
  simPhase: 'idle' | 'listening' | 'recording' | 'analyzing' | 'results'
  simHighlight: number
  simExpStep: number
  simResults: any
  onClose: () => void
  onListen: () => void
  onRecord: () => void
  onStopRecording: () => void
  onStartExpansion: () => void
  onTryAgain: () => void
}

export const CoachSim: React.FC<CoachSimProps> = ({
  simItem,
  simPhase,
  simHighlight,
  simExpStep,
  simResults,
  onClose,
  onListen,
  onRecord,
  onStopRecording,
  onStartExpansion,
  onTryAgain
}) => {
  if (!simItem) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
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
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
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
                  <button onClick={onListen} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    <Volume2 className="h-4 w-4" /> Listen
                  </button>
                  <button onClick={onRecord} className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    <Mic className="h-4 w-4" /> Record
                  </button>
                </>
              ) : (
                <button onClick={onStartExpansion} className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
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
                onClick={onStopRecording}
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Score rings */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Fluency', value: simResults.fluency_score, color: simResults.fluency_score > 70 ? 'text-green-400' : simResults.fluency_score > 50 ? 'text-amber-400' : 'text-rose-400', bg: simResults.fluency_score > 70 ? 'bg-green-500/10 border-green-500/20' : simResults.fluency_score > 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20' },
                  { label: 'Pronunciation', value: simResults.pronunciation_score, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                  { label: 'Pace', value: simResults.pace_wpm, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', suffix: ' wpm' },
                ].map((s, i) => (
                  <div key={i} className={cn("rounded-2xl border p-4 text-center transition-all hover:scale-105", s.bg)}>
                    <p className={cn("text-2xl font-black", s.color)}>{Math.round(s.value)}{s.suffix || '%'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Transcription Comparison */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                  <Mic className="h-3 w-3" /> Real-time Transcription
                </p>
                <div className="flex flex-wrap gap-2">
                  {simResults.word_timings && simResults.word_timings.length > 0 ? (
                    simResults.word_timings.map((wt: any, i: number) => (
                      <div key={i} className="group relative">
                        <span 
                          className={cn(
                            "px-2 py-1 rounded-lg text-sm font-medium transition-all cursor-default",
                            wt.confidence > 0.8 ? "bg-green-500/20 text-green-300" : "bg-rose-500/20 text-rose-300"
                          )}
                        >
                          {wt.word}
                        </span>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-10">
                          Conf: {Math.round(wt.confidence * 100)}%
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm italic">No transcription available. Try speaking more clearly.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
                  <BarChart3 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-300 font-medium">
                    {Array.isArray(simResults.hesitations) ? simResults.hesitations.length : simResults.hesitations || 0} hesitations
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
                  <Target className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-300 font-medium">
                    Target: {simItem.target_wpm} wpm
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-teal-500/20 border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
                <p className="text-sm text-slate-200 font-medium relative z-10 leading-relaxed">
                  {simResults.feedback_text || simResults.feedback || "Drill complete! Keep practicing to improve your consistency."}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={onTryAgain}
                  className="flex-1 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw className="h-4 w-4" /> Try Again
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
