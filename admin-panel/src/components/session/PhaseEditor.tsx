import React, { useState } from 'react'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { cn, getId } from '../../lib/utils'

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
  allVocab?: any[]
  allGames?: any[]
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
  games,
  allVocab,
  allGames,
  onLessonUpdate,
  onVocabUpdate,
  onOverrideUpdate,
}) => {
  const [tab, setTab] = useState<"settings" | "content">("settings")
  const [showLibrary, setShowLibrary] = useState(false)
  const s = phase.settings
  const hasContent = lesson || (vocabulary && vocabulary.length > 0) || phase.phase_type === "pronunciation" || phase.phase_type === "conversation" || phase.phase_type === "game"

  return (
    <>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Vocabulary Source</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onChange({ ...phase, settings: { ...s, specific_vocab_ids: undefined } })}
                    className={cn("px-2 py-1 rounded text-[10px] font-bold", !s.specific_vocab_ids ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}
                  >
                    ALL LESSON VOCAB
                  </button>
                  <button 
                    onClick={() => onChange({ ...phase, settings: { ...s, specific_vocab_ids: s.specific_vocab_ids || [] } })}
                    className={cn("px-2 py-1 rounded text-[10px] font-bold", s.specific_vocab_ids ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}
                  >
                    SELECT SPECIFIC
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {vocabulary.map((v: any, idx: number) => {
                  const vId = getId(v);
                  const isSelected = !s.specific_vocab_ids || s.specific_vocab_ids.includes(vId);
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        const current = s.specific_vocab_ids || vocabulary.map(x => getId(x));
                        const next = current.includes(vId) 
                          ? current.filter(id => id !== vId)
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

          {/* Game content */}
          {phase.phase_type === "game" && (
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
                  const isSelected = !s.specific_game_ids || s.specific_game_ids.includes(gId);

                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        const current = s.specific_game_ids || (games || []).map(x => getId(x));
                        const next = current.includes(gId) 
                          ? current.filter(id => id !== gId)
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
                <button className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors">
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

    {/* Global Library Modal */}
    {showLibrary && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-slate-200">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight">
                {phase.phase_type === 'game' ? 'Gamification Library' : 'VocabForge Library'}
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
            {(phase.phase_type === 'game' ? allGames : allVocab)?.map((item: any) => {
              const itemId = getId(item);
              const isSelected = phase.phase_type === 'game' 
                ? s.specific_game_ids?.includes(itemId)
                : s.specific_vocab_ids?.includes(itemId);

              return (
                <div 
                  key={itemId}
                  onClick={() => {
                    if (phase.phase_type === 'game') {
                      const current = s.specific_game_ids || [];
                      const next = isSelected ? current.filter(id => id !== itemId) : [...current, itemId];
                      onChange({ ...phase, settings: { ...s, specific_game_ids: next } });
                    } else {
                      const current = s.specific_vocab_ids || [];
                      const next = isSelected ? current.filter(id => id !== itemId) : [...current, itemId];
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
                      {phase.phase_type === 'game' ? item.title : item.word}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {phase.phase_type === 'game' ? item.game_type : item.translation}
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
