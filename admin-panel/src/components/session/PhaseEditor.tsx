import React, { useState } from 'react'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'

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
  onLessonUpdate?: (l: any) => void
  onVocabUpdate?: (v: any) => void
  onOverrideUpdate?: (field: string, value: any) => void
}

const PHASE_LABELS: Record<string, string> = {
  read: "📖 Read",
  flashcard: "🃏 Flashcards",
  vocab_drill: "🧩 Vocab Drill",
  game: "🎮 Games",
  pronunciation: "🎤 Pronunciation",
  conversation: "💬 Conversation",
}

export const PhaseEditor: React.FC<PhaseEditorProps> = ({
  phase,
  onChange,
  lesson,
  vocabulary,
  onLessonUpdate,
  onVocabUpdate,
  onOverrideUpdate,
}) => {
  const [tab, setTab] = useState<"settings" | "content">("settings")
  const s = phase.settings
  const hasContent = lesson || (vocabulary && vocabulary.length > 0) || phase.phase_type === "pronunciation" || phase.phase_type === "conversation"

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        phase.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{PHASE_LABELS[phase.phase_type]}</span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">order:{phase.order}</span>
          </div>

          {phase.enabled && hasContent && (
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

      {phase.enabled && tab === "settings" && (
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
        </div>
      )}

      {phase.enabled && tab === "content" && (
        <div className="mt-2 pt-3 border-t border-slate-100 space-y-3">
          {/* Read content */}
          {phase.phase_type === "read" && lesson && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reading Content</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-32 leading-relaxed"
                value={lesson.content || ""}
                onChange={(e) => onLessonUpdate && onLessonUpdate({ ...lesson, content: e.target.value, _dirty: true })}
              />
            </div>
          )}

          {/* Vocab content */}
          {(phase.phase_type === "vocab_drill" || phase.phase_type === "flashcard") && vocabulary && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Vocabulary Stack ({vocabulary.length})</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {vocabulary.map((v: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <input
                      className="bg-transparent text-[10px] font-bold text-slate-800 outline-none"
                      value={v.word || ""}
                      onChange={(e) => onVocabUpdate && onVocabUpdate({ ...v, word: e.target.value, _dirty: true })}
                    />
                    <input
                      className="bg-transparent text-[10px] text-slate-500 outline-none italic"
                      value={v.translation || ""}
                      onChange={(e) => onVocabUpdate && onVocabUpdate({ ...v, translation: e.target.value, _dirty: true })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pronunciation content */}
          {phase.phase_type === "pronunciation" && onOverrideUpdate && (
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                  Specific Sentences
                  <button 
                    onClick={() => onOverrideUpdate("pronunciation_sentences", [...(lesson?.pronunciation_sentences || []), ""])}
                    className="text-blue-600 hover:underline"
                  >
                    + ADD
                  </button>
                </label>
                <div className="space-y-2">
                  {(lesson?.pronunciation_sentences || []).map((s: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                        value={s}
                        onChange={(e) => {
                          const copy = [...lesson.pronunciation_sentences]
                          copy[idx] = e.target.value
                          onOverrideUpdate("pronunciation_sentences", copy)
                        }}
                      />
                      <button 
                        onClick={() => onOverrideUpdate("pronunciation_sentences", lesson.pronunciation_sentences.filter((_:any, i:number) => i !== idx))}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {/* Conversation content */}
          {phase.phase_type === "conversation" && onOverrideUpdate && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Scenario Prompt Override</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-24 leading-relaxed"
                placeholder="e.g. You are a guest checking in. Be difficult about the room view..."
                value={lesson?.conversation_prompt || ""}
                onChange={(e) => onOverrideUpdate("conversation_prompt", e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
