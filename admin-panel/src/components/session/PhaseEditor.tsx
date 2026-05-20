import React, { useState, useRef, useCallback } from 'react'
import { Plus, X, Pencil, Trash2, Upload, Loader2, Film, GripVertical, Trophy, Heart, Volume2, Play, Check, RefreshCw, AlertCircle, ArrowRight, MessageCircle, Keyboard, Gamepad2, Sparkles, Mic } from 'lucide-react'
import { cn, getId } from '../../lib/utils'
import { uploadAsset } from '../../services/api'

/** Drag-and-drop + click-to-browse video upload zone */
const VideoUploadZone: React.FC<{ onUploadComplete: (url: string) => void }> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file (mp4, webm, mov, etc.)')
      return
    }
    if (file.size > 200 * 1024 * 1024) {
      alert('Video must be under 200MB')
      return
    }
    setUploading(true)
    setProgress(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)...`)
    try {
      const data = await uploadAsset(file)
      onUploadComplete(data.url)
    } catch (err) {
      console.error('Video upload failed:', err)
      alert('Failed to upload video. Please try again.')
    } finally {
      setUploading(false)
      setProgress('')
    }
  }, [onUploadComplete])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      onClick={() => !uploading && fileRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
        dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        uploading && "pointer-events-none opacity-70"
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <p className="text-[10px] font-bold text-blue-600">{progress}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Film className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-[10px] font-bold text-slate-500">DROP VIDEO HERE OR CLICK TO BROWSE</p>
          <p className="text-[9px] text-slate-400">MP4, WebM, MOV • Max 200MB</p>
        </div>
      )}
    </div>
  )
}

interface PhaseSettings {
  difficulty?: string
  auto_play_audio?: boolean
  show_translation?: boolean
  drill_types?: string[]
  max_drill_count?: number
  sentence_count?: number
  min_accuracy_score?: number
  speed?: string
  turn_count?: number
  video_url?: string
  specific_vocab_ids?: string[]
  specific_game_ids?: string[]
  specific_video_drill_ids?: string[]
  specific_vocab_group_ids?: string[]
  excluded_vocab_ids?: string[]
}

interface PhaseConfig {
  phase_type: string
  enabled: boolean
  order: number
  settings: PhaseSettings
}

interface PhaseEditorProps {
  phase: PhaseConfig
  onChange: (p: PhaseConfig) => void
  lesson?: any
  vocabulary?: any[]
  games?: any[]
  videoDrills?: any[]
  allVocab?: any[]
  allGames?: any[]
  allVideoDrills?: any[]
  vocabGroups?: any[]
  onLessonUpdate?: (l: any) => void
  onVocabUpdate?: (v: any) => void
  onOverrideUpdate?: (field: string, value: any) => void
  overrideConfig?: any
  isTemplate?: boolean
}

const PHASE_LABELS: Record<string, string> = {
  objective: "🎯 Objective",
  read: "📖 Read",
  flashcard: "🃏 Flashcards",
  vocab_drill: "🧩 Vocab Drill",
  translation_drill: "⌨️ Translation Drill",
  game: "🎮 Games",
  pronunciation: "🎤 Pronunciation",
  conversation: "💬 Conversation",
  video_drill: "🎬 Video Drill",
}

export const PhaseEditor: React.FC<PhaseEditorProps> = ({
  phase,
  onChange,
  lesson,
  overrideConfig,
  vocabulary,
  games,
  videoDrills,
  allVocab,
  allGames,
  allVideoDrills,
  vocabGroups,
  onLessonUpdate,
  onVocabUpdate,
  onOverrideUpdate,
  isTemplate = false,
}) => {
  const hasSettings = phase.phase_type !== "objective" && phase.phase_type !== "read"

  const hasContent = !isTemplate && (
    phase.phase_type === "objective" ||
    phase.phase_type === "read" ||
    phase.phase_type === "flashcard" ||
    phase.phase_type === "vocab_drill" ||
    phase.phase_type === "translation_drill" ||
    phase.phase_type === "game" ||
    phase.phase_type === "video_drill" ||
    phase.phase_type === "pronunciation" ||
    phase.phase_type === "conversation"
  )

  const getInitialTab = (): "settings" | "content" => {
    if (isTemplate) return "settings"
    if (!hasSettings) return "content"
    if (phase.phase_type === "read" || phase.phase_type === "pronunciation" || phase.phase_type === "conversation" || phase.phase_type === "objective") {
      return "content"
    }
    return "settings"
  }

  const [tab, setTab] = useState<"settings" | "content">(getInitialTab())
  const [showLibrary, setShowLibrary] = useState(false)
  const [simWordIdx, setSimWordIdx] = useState(0)
  const [simFlipped, setSimFlipped] = useState(false)
  const [simSelectedOption, setSimSelectedOption] = useState<number | null>(null)
  const [simInputVal, setSimInputVal] = useState("")
  const [simShowAnswer, setSimShowAnswer] = useState(false)
  const [simPronounceActive, setSimPronounceActive] = useState(false)
  const s = phase.settings

  const hasId = (arr: any[] | undefined | null, targetId: string): boolean => {
    if (!arr) return false;
    return arr.some(item => getId(item) === targetId);
  };

  const getActiveWords = () => {
    let list = vocabulary || [];
    if (s.specific_vocab_ids && s.specific_vocab_ids.length > 0) {
      list = (vocabulary || []).filter(v => s.specific_vocab_ids?.includes(getId(v)));
    } else if (s.specific_vocab_group_ids && s.specific_vocab_group_ids.length > 0 && allVocab) {
      list = allVocab.filter(v => s.specific_vocab_group_ids?.includes(getId(v.set_id || v.group_id)));
    }
    if (list.length === 0) {
      list = vocabulary || [];
    }
    return list;
  };

  const renderSimulator = (progressPercent: number, children: React.ReactNode) => {
    return (
      <div className="border border-slate-200 rounded-[2.5rem] bg-slate-100 p-4 shadow-inner">
        <div className="text-[10px] font-black text-slate-400 mb-2 text-center uppercase tracking-widest">📱 Student Portal Live View</div>
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col shadow-lg">
          <header className="px-4 py-3 flex items-center gap-3 border-b border-slate-50 bg-white">
            <button className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-not-allowed" disabled>
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-300" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 rounded-full border border-rose-100 text-rose-500 font-bold text-[10px]">
              <Heart className="w-3 h-3 fill-rose-500" />
              <span>5</span>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 flex flex-col items-center min-h-[300px] justify-center bg-white text-center">
            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-6">
              Phase {phase.order + 1}: {phase.phase_type.replace('_', ' ')}
            </span>
            {children}
          </main>

          <footer className="px-4 py-4 border-t border-slate-100 bg-white flex justify-center">
            <div className="w-full flex gap-3">
              <button className="flex-1 bg-slate-100 text-slate-400 py-3 rounded-[1.5rem] font-black text-xs cursor-not-allowed" disabled>
                Check Answer
              </button>
              <button className="flex-1 bg-blue-600 text-white py-3 rounded-[1.5rem] font-black text-xs shadow-md shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all">
                Continue
              </button>
            </div>
          </footer>
        </div>
      </div>
    );
  };

  const showTabs = phase.enabled && hasSettings && hasContent

  return (
    <>
      <div
        className={`rounded-xl border p-4 transition-colors ${
          phase.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"
        }`}
      >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Grip Icon for HTML5 Drag-and-Drop */}
          <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1 rounded hover:bg-slate-50 drag-handle flex items-center justify-center">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{PHASE_LABELS[phase.phase_type]}</span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">order:{phase.order}</span>
          </div>

          {showTabs && (
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg ml-2">
              <button
                onClick={() => setTab("settings")}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                  tab === "settings" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                }`}
              >
                SETTINGS
              </button>
              <button
                onClick={() => setTab("content")}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                  tab === "content" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                }`}
              >
                CONTENT
              </button>
            </div>
          )}
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={phase.enabled}
            onChange={(e) => onChange({ ...phase, enabled: e.target.checked })}
            className="rounded border-slate-300 text-blue-600"
          />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enabled</span>
        </label>
      </div>

      {phase.enabled && tab === "settings" && hasSettings && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {/* Game/Drill difficulty */}
          {(phase.phase_type === "game" || phase.phase_type === "vocab_drill") && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Difficulty</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                value={s.difficulty || "easy"}
                onChange={(e) =>
                  onChange({ ...phase, settings: { ...s, difficulty: e.target.value } })
                }
              >
                <option>easy</option>
                <option>medium</option>
                <option>hard</option>
              </select>
            </div>
          )}

          {phase.phase_type === "game" && (
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Video URL</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                placeholder="https://example.com/video.mp4"
                value={s.video_url || ""}
                onChange={(e) =>
                  onChange({ ...phase, settings: { ...s, video_url: e.target.value } })
                }
              />
            </div>
          )}

          {/* Flashcard settings */}
          {phase.phase_type === "flashcard" && (
            <>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={s.auto_play_audio ?? true}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, auto_play_audio: e.target.checked } })
                  }
                  className="rounded border-slate-300"
                />
                <span className="text-xs text-slate-600">Auto-play audio</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={s.show_translation ?? true}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, show_translation: e.target.checked } })
                  }
                  className="rounded border-slate-300"
                />
                <span className="text-xs text-slate-600">Show translation</span>
              </label>
            </>
          )}

          {/* Pronunciation settings */}
          {phase.phase_type === "pronunciation" && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Sentences</label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  value={s.sentence_count ?? 3}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, sentence_count: +e.target.value } })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Min Accuracy %</label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  value={s.min_accuracy_score ?? 60}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, min_accuracy_score: +e.target.value } })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Speed</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  value={s.speed || "normal"}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, speed: e.target.value } })
                  }
                >
                  <option>slow</option>
                  <option>normal</option>
                  <option>fast</option>
                </select>
              </div>
            </>
          )}

          {/* Conversation settings */}
          {phase.phase_type === "conversation" && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Turns</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                value={s.turn_count ?? 3}
                onChange={(e) =>
                  onChange({ ...phase, settings: { ...s, turn_count: +e.target.value } })
                }
              />
            </div>
          )}

          {/* Max drill count for vocab_drill, translation_drill, video_drill */}
          {(phase.phase_type === "vocab_drill" || phase.phase_type === "translation_drill" || phase.phase_type === "video_drill") && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Max Drill Count</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                placeholder="e.g. 5"
                value={s.max_drill_count ?? ""}
                onChange={(e) =>
                  onChange({ ...phase, settings: { ...s, max_drill_count: e.target.value ? +e.target.value : undefined } })
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Fallback for no template-level configuration */}
      {phase.enabled && tab === "settings" && !hasSettings && (
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 font-medium italic flex items-center justify-center gap-2">
          ✨ No template-level configuration required for {PHASE_LABELS[phase.phase_type] || phase.phase_type}.
        </div>
      )}

      {phase.enabled && tab === "content" && (
        <div className="mt-2 pt-3 border-t border-slate-100 space-y-3">
          {/* Objective content */}
          {phase.phase_type === "objective" && lesson && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lesson Objective / Goal</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-32 leading-relaxed"
                  placeholder="e.g. By the end of this lesson, students will be able to greet hotel guests confidently and handle check-in conversations..."
                  value={lesson.objective || ""}
                  onChange={(e) => onLessonUpdate && onLessonUpdate({ ...lesson, objective: e.target.value, _dirty: true })}
                />
              </div>

              {renderSimulator(15, (
                <div className="w-full space-y-6">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2 shadow-xl shadow-emerald-500/20">
                    <Trophy className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Your Goal Today</h3>
                  <div className="p-6 bg-emerald-50 rounded-[2rem] text-center border-2 border-emerald-100 shadow-sm w-full">
                    <p className="text-sm text-emerald-900 leading-relaxed font-black">
                      {lesson.objective || "Complete this lesson successfully."}
                    </p>
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-6">Are you ready?</p>
                </div>
              ))}
            </div>
          )}

          {/* Read content */}
          {phase.phase_type === "read" && lesson && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reading Content</label>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-32 leading-relaxed"
                    placeholder="Type the reading material for the student..."
                    value={lesson.content || ""}
                    onChange={(e) => onLessonUpdate && onLessonUpdate({ ...lesson, content: e.target.value, _dirty: true })}
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lesson Video</label>
                  {lesson.video_url ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
                        <video
                          src={lesson.video_url}
                          controls
                          className="w-full h-full object-contain"
                          preload="metadata"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-[10px] text-slate-500 bg-slate-50 truncate"
                          value={lesson.video_url}
                          readOnly
                        />
                        <button
                          onClick={() => onLessonUpdate && onLessonUpdate({ ...lesson, video_url: '', _dirty: true })}
                          className="px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <VideoUploadZone
                      onUploadComplete={(url: string) => onLessonUpdate && onLessonUpdate({ ...lesson, video_url: url, _dirty: true })}
                    />
                  )}
                </div>
              </div>

              {renderSimulator(30, (
                <div className="w-full space-y-4">
                  <h3 className="text-xl font-black text-slate-900">Read & Listen</h3>
                  
                  {lesson.video_url ? (
                    <div className="w-full aspect-video rounded-[1.5rem] overflow-hidden bg-slate-900 shadow-lg border-2 border-slate-100">
                      <video 
                        src={lesson.video_url} 
                        controls 
                        className="w-full h-full object-contain"
                        preload="metadata"
                      />
                    </div>
                  ) : lesson.image_url ? (
                    <div className="w-full aspect-video rounded-[1.5rem] overflow-hidden bg-slate-100 shadow-lg border-2 border-slate-100 flex items-center justify-center">
                      <img 
                        src={lesson.image_url} 
                        alt="Lesson intro" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : null}

                  {lesson.audio_url && (
                    <div className="w-full bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                        <Volume2 className="w-4 h-4 text-indigo-500" />
                        <span>Listen to the lesson</span>
                      </div>
                      <audio 
                        src={lesson.audio_url} 
                        controls 
                        className="w-full max-w-xs scale-90"
                        preload="metadata"
                      />
                    </div>
                  )}

                  <div className="p-5 bg-slate-50 rounded-[1.5rem] text-left border border-slate-100 w-full">
                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      {lesson.content || "Reading content will be simulated here..."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Flashcard, Vocab Drill, and Translation Drill content split view */}
          {(phase.phase_type === "vocab_drill" || phase.phase_type === "flashcard" || phase.phase_type === "translation_drill") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Vocabulary Source Mode</label>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => onChange({ ...phase, settings: { ...s, specific_vocab_ids: undefined, specific_vocab_group_ids: undefined, excluded_vocab_ids: undefined } })}
                      className={cn("px-2 py-1 rounded text-[10px] font-bold", !s.specific_vocab_ids && !s.specific_vocab_group_ids ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}
                    >
                      ALL LESSON VOCAB
                    </button>
                    <button 
                      onClick={() => onChange({ ...phase, settings: { ...s, specific_vocab_ids: s.specific_vocab_ids || [], specific_vocab_group_ids: undefined, excluded_vocab_ids: undefined } })}
                      className={cn("px-2 py-1 rounded text-[10px] font-bold", s.specific_vocab_ids !== undefined ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}
                    >
                      SELECT SPECIFIC WORDS
                    </button>
                    <button 
                      onClick={() => onChange({ ...phase, settings: { ...s, specific_vocab_group_ids: s.specific_vocab_group_ids || [], specific_vocab_ids: undefined, excluded_vocab_ids: s.excluded_vocab_ids || [] } })}
                      className={cn("px-2 py-1 rounded text-[10px] font-bold", s.specific_vocab_group_ids !== undefined ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}
                    >
                      SELECT BY TOPIC/GROUP
                    </button>
                  </div>
                </div>

                {s.specific_vocab_group_ids !== undefined && (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Topic Groups</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {(vocabGroups || []).map((vg: any, idx: number) => {
                        const vgId = getId(vg);
                        const isSelected = hasId(s.specific_vocab_group_ids, vgId);
                        return (
                          <div 
                            key={idx} 
                            onClick={() => {
                              const current = s.specific_vocab_group_ids || [];
                              const next = isSelected 
                                ? current.filter(id => getId(id) !== vgId)
                                : [...current, vgId];
                              onChange({ ...phase, settings: { ...s, specific_vocab_group_ids: next } });
                            }}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all",
                              isSelected ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100 opacity-50"
                            )}
                          >
                            <input 
                              type="checkbox" 
                              readOnly 
                              checked={isSelected}
                              className="rounded border-slate-300 text-blue-600"
                            />
                            <div className="flex flex-col">
                              <p className="text-[10px] font-bold text-slate-800">{vg.title}</p>
                              <p className="text-[10px] text-slate-500 italic">{vg.topic} • {vg.level}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(s.specific_vocab_ids !== undefined || !s.specific_vocab_group_ids) && s.specific_vocab_group_ids === undefined && vocabulary && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {vocabulary.map((v: any, idx: number) => {
                        const vId = getId(v);
                        const isSelected = !s.specific_vocab_ids || hasId(s.specific_vocab_ids, vId);
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={() => {
                              if (!s.specific_vocab_ids) return;
                              const current = s.specific_vocab_ids;
                              const next = isSelected 
                                ? current.filter(id => getId(id) !== vId)
                                : [...current, vId];
                              onChange({ ...phase, settings: { ...s, specific_vocab_ids: next } });
                            }}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all",
                              isSelected ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100 opacity-50"
                            )}
                          >
                            <input 
                              type="checkbox" 
                              readOnly 
                              checked={isSelected}
                              disabled={!s.specific_vocab_ids}
                              className="rounded border-slate-300 text-blue-600"
                            />
                            <div className="flex flex-col">
                              <p className="text-[10px] font-bold text-slate-800">{v.word}</p>
                              <p className="text-[10px] text-slate-500 italic">{v.translation}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {s.specific_vocab_ids && (
                      <button 
                        onClick={() => setShowLibrary(true)}
                        className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-all"
                      >
                        + PICK FROM GLOBAL LIBRARY
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Render Simulator for Flashcard / Vocab Drill / Translation Drill */}
              {(() => {
                const activeWords = getActiveWords();
                const progressPercent = phase.phase_type === "flashcard" ? 45 : phase.phase_type === "vocab_drill" ? 55 : 65;
                const currentWord = activeWords[simWordIdx % Math.max(1, activeWords.length)];

                if (phase.phase_type === "flashcard") {
                  return renderSimulator(progressPercent, (
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 tracking-wider">
                        <span>CARD {activeWords.length > 0 ? (simWordIdx % activeWords.length) + 1 : 0} OF {activeWords.length}</span>
                        <span className="text-blue-500">Preview Mode</span>
                      </div>

                      {currentWord ? (
                        <div 
                          onClick={() => setSimFlipped(!simFlipped)}
                          className="w-full h-48 bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col justify-between shadow-md cursor-pointer hover:border-blue-300 transition-all select-none relative"
                        >
                          {!simFlipped ? (
                            <>
                              <div className="flex justify-between items-start">
                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                                  English
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if ('speechSynthesis' in window) {
                                      const u = new SpeechSynthesisUtterance(currentWord.word);
                                      u.lang = 'en-US';
                                      window.speechSynthesis.speak(u);
                                    }
                                  }}
                                  className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full transition-colors"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-center my-auto">
                                <p className="text-2xl font-black text-slate-900 tracking-tight mb-1">{currentWord.word}</p>
                                <p className="text-xs font-bold text-blue-500">/{currentWord.pronunciation || currentWord.pronunciation_guide || "pronunciation"}/</p>
                              </div>
                              <div className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                🔄 Click to flip card
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between items-start">
                                <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                                  Indonesian
                                </span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Translation</span>
                              </div>
                              <div className="text-center my-auto">
                                <p className="text-2xl font-black text-slate-900 tracking-tight">{currentWord.translation}</p>
                                {currentWord.example_sentence && (
                                  <p className="text-[10px] text-slate-500 italic mt-2 line-clamp-2 px-2">"{currentWord.example_sentence}"</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSimFlipped(false);
                                    setSimWordIdx((simWordIdx + 1) % activeWords.length);
                                  }}
                                  className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200/50 py-1.5 rounded-xl font-black text-[10px] transition-colors"
                                >
                                  Review
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSimFlipped(false);
                                    setSimWordIdx((simWordIdx + 1) % activeWords.length);
                                  }}
                                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/50 py-1.5 rounded-xl font-black text-[10px] transition-colors"
                                >
                                  Mastered
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 font-bold text-xs">No vocabulary words available.</div>
                      )}
                    </div>
                  ));
                }

                if (phase.phase_type === "vocab_drill") {
                  const correct = currentWord?.translation;
                  const others = (vocabulary || []).filter(v => v.translation !== correct).map(v => v.translation);
                  const options = [correct];
                  if (others.length > 0) options.push(others[0]);
                  if (others.length > 1) options.push(others[1]);
                  while (options.length < 3) {
                    options.push("Wrong Option " + (options.length + 1));
                  }
                  const sortedOptions = options.sort((a, b) => a.localeCompare(b));

                  return renderSimulator(progressPercent, (
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 tracking-wider">
                        <span>QUESTION {activeWords.length > 0 ? (simWordIdx % activeWords.length) + 1 : 0} OF {activeWords.length}</span>
                      </div>

                      {currentWord ? (
                        <div className="space-y-4 text-center">
                          <p className="text-xs text-slate-500 font-semibold">Select the correct translation:</p>
                          <div className="p-5 bg-blue-600 rounded-2xl text-white shadow-sm flex items-center justify-between text-left">
                            <div>
                              <p className="text-[9px] text-blue-100 font-bold uppercase tracking-wider mb-0.5">Target Term</p>
                              <p className="text-xl font-black tracking-tight leading-none">{currentWord.word}</p>
                            </div>
                            <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {sortedOptions.map((opt, i) => {
                              const isCorrect = opt === currentWord.translation;
                              const isSelected = simSelectedOption === i;
                              let btnClass = "border-slate-200 bg-white hover:border-slate-300 text-slate-700";
                              if (simSelectedOption !== null) {
                                if (isCorrect) btnClass = "border-green-500 bg-green-50 text-green-700";
                                else if (isSelected) btnClass = "border-rose-500 bg-rose-50 text-rose-700";
                                else btnClass = "border-slate-100 bg-white text-slate-300 opacity-60";
                              }
                              return (
                                <button 
                                  key={i}
                                  disabled={simSelectedOption !== null}
                                  onClick={() => setSimSelectedOption(i)}
                                  className={`p-3 border-2 rounded-xl text-left font-bold text-xs transition-all flex items-center justify-between ${btnClass}`}
                                >
                                  <span>{opt}</span>
                                  {simSelectedOption !== null && isCorrect && <Check className="w-4 h-4 text-green-500" />}
                                  {simSelectedOption !== null && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-500" />}
                                </button>
                              )
                            })}
                          </div>

                          {simSelectedOption !== null && (
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left">
                              <div>
                                <p className="font-black text-[10px] text-slate-800">
                                  {sortedOptions[simSelectedOption] === currentWord.translation ? "Correct!" : "Incorrect!"}
                                </p>
                                <p className="text-[9px] text-slate-500">Correct translation: {currentWord.translation}</p>
                              </div>
                              <button 
                                onClick={() => {
                                  setSimSelectedOption(null);
                                  setSimWordIdx((simWordIdx + 1) % activeWords.length);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-700"
                              >
                                Continue
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 font-bold text-xs">No vocabulary words available.</div>
                      )}
                    </div>
                  ));
                }

                if (phase.phase_type === "translation_drill") {
                  return renderSimulator(progressPercent, (
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 tracking-wider">
                        <span>WRITING DRILL {activeWords.length > 0 ? (simWordIdx % activeWords.length) + 1 : 0} OF {activeWords.length}</span>
                      </div>

                      {currentWord ? (
                        <div className="space-y-4 text-center">
                          <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1">
                            <Keyboard className="w-3.5 h-3.5 text-blue-500" />
                            Write the translation:
                          </p>
                          <div className="p-5 bg-blue-600 rounded-2xl text-white shadow-sm flex items-center justify-between text-left">
                            <div>
                              <p className="text-[9px] text-blue-100 font-bold uppercase tracking-wider mb-0.5">Translate this word</p>
                              <p className="text-xl font-black tracking-tight leading-none">{currentWord.word}</p>
                            </div>
                            <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="relative">
                            <input 
                              type="text"
                              value={simInputVal}
                              disabled={simShowAnswer}
                              onChange={(e) => setSimInputVal(e.target.value)}
                              placeholder="Ketik bahasa Indonesia..."
                              className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all ${
                                simShowAnswer
                                  ? simInputVal.trim().toLowerCase() === currentWord.translation.trim().toLowerCase()
                                    ? "border-green-500 bg-green-50/20 text-green-700"
                                    : "border-rose-500 bg-rose-50/20 text-rose-700"
                                  : "focus:border-blue-500"
                              }`}
                            />
                          </div>

                          {!simShowAnswer ? (
                            <button 
                              disabled={!simInputVal.trim()}
                              onClick={() => setSimShowAnswer(true)}
                              className={`w-full py-3 rounded-xl font-black text-xs shadow-sm transition-all ${
                                simInputVal.trim()
                                  ? "bg-blue-600 text-white hover:scale-102 cursor-pointer"
                                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              Check Answer
                            </button>
                          ) : (
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left">
                              <div>
                                <p className="font-black text-[10px] text-slate-800">
                                  {simInputVal.trim().toLowerCase() === currentWord.translation.trim().toLowerCase() ? "Perfect! Correct!" : "Review needed!"}
                                </p>
                                <p className="text-[9px] text-slate-500">Correct translation: {currentWord.translation}</p>
                              </div>
                              <button 
                                onClick={() => {
                                  setSimInputVal("");
                                  setSimShowAnswer(false);
                                  setSimWordIdx((simWordIdx + 1) % activeWords.length);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-700"
                              >
                                Continue
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 font-bold text-xs">No vocabulary words available.</div>
                      )}
                    </div>
                  ));
                }
                return null;
              })()}
            </div>
          )}

          {/* Game content */}
          {phase.phase_type === "game" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Game Source</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onChange({ ...phase, settings: { ...s, specific_game_ids: undefined } })}
                      className={cn("px-2 py-1 rounded text-[10px] font-bold", !s.specific_game_ids ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}
                    >
                      ALL LESSON GAMES
                    </button>
                    <button 
                      onClick={() => onChange({ ...phase, settings: { ...s, specific_game_ids: s.specific_game_ids || [] } })}
                      className={cn("px-2 py-1 rounded text-[10px] font-bold", s.specific_game_ids ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}
                    >
                      SELECT SPECIFIC
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {(games || []).map((g: any, idx: number) => {
                    const gId = getId(g);
                    const isSelected = !s.specific_game_ids || hasId(s.specific_game_ids, gId);

                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          const current = s.specific_game_ids || (games || []).map(x => getId(x));
                          const next = hasId(current, gId) 
                            ? current.filter(id => getId(id) !== gId)
                            : [...current, gId];
                          onChange({ ...phase, settings: { ...s, specific_game_ids: next } });
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100 opacity-50"
                        )}
                      >
                        <input 
                          type="checkbox" 
                          readOnly 
                          checked={isSelected}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black text-slate-800 uppercase">{g.game_type}</p>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 uppercase">{g.difficulty}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900">{g.title}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{g.instructions}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => window.open('/gamification', '_blank')}
                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                  >
                    + CREATE NEW GAME FOR LESSON
                  </button>
                  {s.specific_game_ids && (
                    <button 
                      onClick={() => setShowLibrary(true)}
                      className="px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-all"
                    >
                      PICK FROM LIBRARY
                    </button>
                  )}
                </div>
              </div>

              {/* Game Simulator Preview */}
              {(() => {
                const activeGame = (games || []).find(g => !s.specific_game_ids || hasId(s.specific_game_ids, getId(g)));
                return renderSimulator(75, (
                  <div className="w-full space-y-4">
                    <div className="w-full aspect-video rounded-[1.5rem] overflow-hidden bg-slate-900 shadow-md border-2 border-slate-100 flex items-center justify-center relative group">
                      <Play className="w-10 h-10 text-white/80 group-hover:scale-110 transition-transform cursor-pointer" />
                      {s.video_url && (
                        <video src={s.video_url} className="absolute inset-0 w-full h-full object-cover opacity-60" preload="metadata" />
                      )}
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-[8px] font-bold">GAME PREVIEW</span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-[1.5rem] text-left">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Gamepad2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">MISSION</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">{activeGame?.title || "Complete the game challenge"}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">{activeGame?.instructions || "Follow the instructions in the game screen to complete."}</p>
                      <div className="flex gap-2 mt-3">
                        {activeGame?.game_type && (
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[8px] font-bold uppercase">{activeGame.game_type}</span>
                        )}
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] font-bold uppercase">{s.difficulty || "easy"}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Video Drill content */}
          {phase.phase_type === "video_drill" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Video Drill Source</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onChange({ ...phase, settings: { ...s, specific_video_drill_ids: undefined } })}
                      className={cn("px-2 py-1 rounded text-[10px] font-bold", !s.specific_video_drill_ids ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}
                    >
                      ALL LESSON DRILLS
                    </button>
                    <button 
                      onClick={() => onChange({ ...phase, settings: { ...s, specific_video_drill_ids: s.specific_video_drill_ids || [] } })}
                      className={cn("px-2 py-1 rounded text-[10px] font-bold", s.specific_video_drill_ids ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}
                    >
                      SELECT SPECIFIC
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {(videoDrills || []).map((vd: any, idx: number) => {
                    const vdId = getId(vd);
                    const isSelected = !s.specific_video_drill_ids || hasId(s.specific_video_drill_ids, vdId);

                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          const current = s.specific_video_drill_ids || (videoDrills || []).map(x => getId(x));
                          const next = hasId(current, vdId) 
                            ? current.filter(id => getId(id) !== vdId)
                            : [...current, vdId];
                          onChange({ ...phase, settings: { ...s, specific_video_drill_ids: next } });
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100 opacity-50"
                        )}
                      >
                        <input 
                          type="checkbox" 
                          readOnly 
                          checked={isSelected}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black text-slate-800 uppercase">{vd.topic}</p>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 uppercase">{vd.level}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900">{vd.title}</p>
                          <p className="text-[10px] text-slate-500">{vd.steps?.length || 0} steps</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors">
                    + CREATE NEW VIDEO DRILL
                  </button>
                  {s.specific_video_drill_ids && (
                    <button 
                      onClick={() => setShowLibrary(true)}
                      className="px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-all"
                    >
                      PICK FROM LIBRARY
                    </button>
                  )}
                </div>
              </div>

              {/* Video Drill Simulator Preview */}
              {(() => {
                const activeDrill = (videoDrills || []).find(vd => !s.specific_video_drill_ids || hasId(s.specific_video_drill_ids, getId(vd)));
                return renderSimulator(85, (
                  <div className="w-full space-y-4">
                    <div className="w-full aspect-video rounded-[1.5rem] overflow-hidden bg-slate-900 shadow-md border-2 border-slate-100 flex items-center justify-center relative group">
                      <Play className="w-10 h-10 text-white/80 group-hover:scale-110 transition-transform cursor-pointer" />
                      {activeDrill?.video_url && (
                        <video src={activeDrill.video_url} className="absolute inset-0 w-full h-full object-cover opacity-60" preload="metadata" />
                      )}
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-[8px] font-bold">VIDEO DRILL PREVIEW</span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-[1.5rem] text-left">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Film className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">INTERACTIVE VIDEO DRILL</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">{activeDrill?.title || "Interactive Video Practice"}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">{activeDrill?.steps?.length || 0} drill steps configured.</p>
                      {activeDrill?.topic && (
                        <span className="inline-block mt-3 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[8px] font-bold uppercase">{activeDrill.topic}</span>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Pronunciation content */}
          {phase.phase_type === "pronunciation" && onOverrideUpdate && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                  Specific Sentences
                  <button 
                    onClick={() => onOverrideUpdate("pronunciation_sentences", [...(overrideConfig?.pronunciation_sentences || []), ""])}
                    className="text-blue-600 hover:underline font-bold text-xs"
                  >
                    + ADD
                  </button>
                </label>
                <div className="space-y-2">
                  {(overrideConfig?.pronunciation_sentences || []).map((s: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                        value={s}
                        onChange={(e) => {
                          const copy = [...overrideConfig.pronunciation_sentences]
                          copy[idx] = e.target.value
                          onOverrideUpdate("pronunciation_sentences", copy)
                        }}
                      />
                      <button 
                        onClick={() => onOverrideUpdate("pronunciation_sentences", overrideConfig.pronunciation_sentences.filter((_:any, i:number) => i !== idx))}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pronunciation Simulator Preview */}
              {(() => {
                const sentences = overrideConfig?.pronunciation_sentences || [];
                const currentSentence = sentences[simWordIdx % Math.max(1, sentences.length)] || lesson?.title || "Pronounce this target phrase";
                return renderSimulator(90, (
                  <div className="w-full space-y-6 text-center">
                    <p className="text-xs text-slate-500 font-semibold">Listen and repeat carefully:</p>
                    
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 flex flex-col items-center shadow-sm relative">
                      <button 
                        onClick={() => {
                          if ('speechSynthesis' in window) {
                            const u = new SpeechSynthesisUtterance(currentSentence);
                            u.lang = 'en-US';
                            window.speechSynthesis.speak(u);
                          }
                        }}
                        className="absolute top-2 right-2 p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <Volume2 className="w-8 h-8 text-blue-600 mb-3 animate-bounce" />
                      <p className="text-sm font-black text-slate-900 leading-relaxed">"{currentSentence}"</p>
                    </div>

                    <div className="space-y-2">
                      <button 
                        onClick={() => {
                          setSimPronounceActive(true);
                          setTimeout(() => setSimPronounceActive(false), 2000);
                        }}
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md mx-auto transition-all cursor-pointer ${
                          simPronounceActive ? "bg-emerald-500 animate-pulse scale-110" : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 hover:scale-105"
                        }`}
                      >
                        <Mic className="w-6 h-6" />
                      </button>
                      <p className="text-rose-500 font-black uppercase tracking-widest text-[9px]">
                        {simPronounceActive ? "Listening..." : "Tap to Record"}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Conversation content */}
          {phase.phase_type === "conversation" && onOverrideUpdate && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Scenario Prompt Override</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-32 leading-relaxed"
                  placeholder="e.g. You are a guest checking in. Be difficult about the room view..."
                  value={overrideConfig?.conversation_prompt || ""}
                  onChange={(e) => onOverrideUpdate("conversation_prompt", e.target.value)}
                />
              </div>

              {/* Conversation Simulator Preview */}
              {(() => {
                const scenarioPrompt = overrideConfig?.conversation_prompt || "Conversation with Virtual Tutor";
                return renderSimulator(95, (
                  <div className="w-full flex flex-col justify-between h-[320px]">
                    <div className="flex-1 overflow-y-auto space-y-2 p-2 text-left text-[11px] bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-end">
                      <div className="bg-blue-100 text-blue-800 p-2.5 rounded-2xl rounded-tl-none max-w-[85%] self-start font-medium leading-relaxed">
                        👋 Hi! Let's start the dialogue exercise. Here is the scenario:
                        <div className="mt-1 font-bold italic opacity-95 text-[10px]">"{scenarioPrompt}"</div>
                      </div>
                      <div className="bg-slate-200 text-slate-800 p-2.5 rounded-2xl rounded-tr-none max-w-[85%] self-end font-bold">
                        Saya siap! Mari kita mulai.
                      </div>
                      <div className="bg-blue-100 text-blue-800 p-2.5 rounded-2xl rounded-tl-none max-w-[85%] self-start font-medium leading-relaxed">
                        Bagus! Silahkan perkenalkan diri Anda dan tanyakan ketersediaan kamar.
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Tulis balasan Anda..."
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                        disabled
                      />
                      <button className="bg-blue-600 text-white rounded-xl p-2 font-bold text-xs flex items-center justify-center cursor-not-allowed" disabled>
                        Send
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Global Library Modal */}
    {showLibrary && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-slate-200">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">
                {phase.phase_type === 'game' ? 'Gamification Library' : phase.phase_type === 'video_drill' ? 'Video Drill Library' : 'VocabForge Library'}
              </h3>
              <p className="text-sm text-slate-500 font-medium">Select items to inject into this session phase</p>
            </div>
            <button 
              onClick={() => setShowLibrary(false)}
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-3">
            {(phase.phase_type === 'game' ? allGames : phase.phase_type === 'video_drill' ? allVideoDrills : allVocab)?.map((item: any) => {
              const itemId = getId(item);
              const isSelected = phase.phase_type === 'game' 
                ? hasId(s.specific_game_ids, itemId)
                : phase.phase_type === 'video_drill'
                ? hasId(s.specific_video_drill_ids, itemId)
                : hasId(s.specific_vocab_ids, itemId);

              return (
                <div 
                  key={itemId}
                  onClick={() => {
                    if (phase.phase_type === 'game') {
                      const current = s.specific_game_ids || [];
                      const next = isSelected ? current.filter(id => getId(id) !== itemId) : [...current, itemId];
                      onChange({ ...phase, settings: { ...s, specific_game_ids: next } });
                    } else if (phase.phase_type === 'video_drill') {
                      const current = s.specific_video_drill_ids || [];
                      const next = isSelected ? current.filter(id => getId(id) !== itemId) : [...current, itemId];
                      onChange({ ...phase, settings: { ...s, specific_video_drill_ids: next } });
                    } else {
                      const current = s.specific_vocab_ids || [];
                      const next = isSelected ? current.filter(id => getId(id) !== itemId) : [...current, itemId];
                      onChange({ ...phase, settings: { ...s, specific_vocab_ids: next } });
                    }
                  }}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-3xl border-2 transition-all cursor-pointer group",
                    isSelected 
                      ? "bg-blue-50 border-blue-600 shadow-md translate-x-1" 
                      : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    isSelected ? "bg-blue-600 border-blue-600" : "border-slate-200 group-hover:border-slate-300"
                  )}>
                    {isSelected && <Plus className="w-4 h-4 text-white rotate-45" />}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900">
                      {phase.phase_type === 'game' || phase.phase_type === 'video_drill' ? item.title : item.word}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {phase.phase_type === 'game' ? item.game_type : phase.phase_type === 'video_drill' ? `${item.steps?.length || 0} steps` : item.translation}
                    </p>
                  </div>

                  {phase.phase_type === 'game' && (
                    <span className="text-[10px] font-black px-3 py-1 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">
                      {item.difficulty}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => setShowLibrary(false)}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
            >
              Done Selection
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
