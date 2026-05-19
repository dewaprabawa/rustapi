import React from 'react'
import { PhaseEditor } from './PhaseEditor'
import { getId } from '../../lib/utils'

interface ConfigModalProps {
  editConfig: any
  setEditConfig: (cfg: any) => void
  lessons: any[]
  templates: any[]
  onSave: () => void
  saving: boolean
  activeVocab: any[]
  activeGames: any[]
  activeVideoDrills: any[]
  allVocab: any[]
  allGames: any[]
  allVideoDrills: any[]
  vocabGroups: any[]
  courses?: any[]
  modules?: any[]
  onLessonUpdate: (l: any) => void
  onVocabUpdate: (v: any) => void
  onOverrideUpdate: (field: string, value: any) => void
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  editConfig,
  setEditConfig,
  lessons,
  templates,
  onSave,
  saving,
  activeVocab,
  activeGames,
  activeVideoDrills,
  allVocab,
  allGames,
  allVideoDrills,
  vocabGroups,
  courses = [],
  modules = [],
  onLessonUpdate,
  onVocabUpdate,
  onOverrideUpdate
}) => {
  if (!editConfig) return null

  const lesson = lessons.find(l => getId(l) === editConfig.lesson_id)
  const template = templates.find(t => t.level === lesson?.level)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">
          {editConfig._id ? "Edit Override" : "New Override"}
        </h3>
        <button onClick={() => setEditConfig(null)} className="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>

      {!editConfig._id && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Lesson</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={editConfig.lesson_id}
            onChange={(e) => setEditConfig({ ...editConfig, lesson_id: e.target.value })}
          >
            <option value="">Select a lesson…</option>
            {lessons.map((l: any) => {
              const module = modules.find((m: any) => getId(m) === getId(l.module_id));
              const course = courses.find((c: any) => getId(c) === getId(module?.course_id));
              const courseTitle = course ? course.title : "Unknown Course";
              const moduleTitle = module ? module.title : "Unknown Module";
              return (
                <option key={getId(l)} value={getId(l)}>
                  [{courseTitle} ➔ {moduleTitle}] {l.level} - {l.title}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Override Lives (blank = inherit)</label>
          <input
            type="number"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={editConfig.override_lives ?? ""}
            onChange={(e) =>
              setEditConfig({
                ...editConfig,
                override_lives: e.target.value ? +e.target.value : null,
              })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Override XP Multiplier</label>
          <input
            type="number"
            step="0.1"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={editConfig.override_xp_multiplier ?? ""}
            onChange={(e) =>
              setEditConfig({
                ...editConfig,
                override_xp_multiplier: e.target.value ? +e.target.value : null,
              })
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-700">Phases Override</h4>
          <button
            onClick={() => {
              if (editConfig.phases) setEditConfig({ ...editConfig, phases: null })
              else if (template) setEditConfig({ ...editConfig, phases: [...template.phases] })
              else setEditConfig({ ...editConfig, phases: [] })
            }}
            className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
          >
            {editConfig.phases ? "Reset to Template" : "Customize Phases"}
          </button>
        </div>

        {editConfig.phases ? (
          <div className="space-y-4">
            {editConfig.phases.sort((a: any, b: any) => a.order - b.order).map((phase: any, idx: number) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-10 top-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      const newPhases = [...editConfig.phases];
                      if (idx > 0) {
                        const tmp = newPhases[idx].order;
                        newPhases[idx].order = newPhases[idx-1].order;
                        newPhases[idx-1].order = tmp;
                        setEditConfig({ ...editConfig, phases: newPhases });
                      }
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400"
                  >
                    ▲
                  </button>
                  <button 
                    onClick={() => {
                      const newPhases = [...editConfig.phases];
                      if (idx < newPhases.length - 1) {
                        const tmp = newPhases[idx].order;
                        newPhases[idx].order = newPhases[idx+1].order;
                        newPhases[idx+1].order = tmp;
                        setEditConfig({ ...editConfig, phases: newPhases });
                      }
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400"
                  >
                    ▼
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm("Delete this phase?")) {
                        const newPhases = editConfig.phases.filter((_: any, i: number) => i !== idx);
                        setEditConfig({ ...editConfig, phases: newPhases });
                      }
                    }}
                    className="p-1 hover:bg-red-50 rounded text-red-400"
                  >
                    ✕
                  </button>
                </div>
                <PhaseEditor
                  phase={phase}
                  onChange={(updated) => {
                    const phases = [...editConfig.phases]
                    phases[idx] = updated
                    setEditConfig({ ...editConfig, phases })
                  }}
                  lesson={lesson}
                  overrideConfig={editConfig}
                  vocabulary={activeVocab}
                  games={activeGames}
                  videoDrills={activeVideoDrills}
                  allVocab={allVocab}
                  allGames={allGames}
                  allVideoDrills={allVideoDrills}
                  vocabGroups={vocabGroups}
                  onLessonUpdate={onLessonUpdate}
                  onVocabUpdate={onVocabUpdate}
                  onOverrideUpdate={onOverrideUpdate}
                />
              </div>
            ))}

            <div className="pt-2">
              <select 
                className="w-full border-2 border-dashed border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all appearance-none text-center cursor-pointer"
                onChange={(e) => {
                  if (!e.target.value) return;
                  const newPhase = {
                    phase_type: e.target.value,
                    enabled: true,
                    order: editConfig.phases.length,
                    settings: {}
                  };
                  setEditConfig({ ...editConfig, phases: [...editConfig.phases, newPhase] });
                  e.target.value = "";
                }}
              >
                <option value="">+ ADD NEW PHASE TO SESSION</option>
                <option value="objective">🎯 Objective</option>
                <option value="read">📖 Read</option>
                <option value="flashcard">🃏 Flashcard</option>
                <option value="vocab_drill">🧩 Vocab Drill</option>
                <option value="game">🎮 Game</option>
                <option value="video_drill">🎬 Video Drill</option>
                <option value="pronunciation">🎤 Pronunciation</option>
                <option value="conversation">💬 Conversation</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 italic">
            Currently inheriting phases from {template?.level || "template"}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Override"}
        </button>
        <button
          onClick={() => setEditConfig(null)}
          className="px-6 py-2.5 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
