import React, { useState } from 'react'
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  if (!editConfig) return null

  const lesson = lessons.find(l => getId(l) === getId(editConfig.lesson_id))
  const template = templates.find(t => t.level === lesson?.level)

  const sortedPhases = editConfig.phases
    ? [...editConfig.phases].sort((a: any, b: any) => a.order - b.order)
    : []

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

      {editConfig._id && lesson && (
        <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Active Lesson Override</span>
            <h4 className="text-sm font-bold text-slate-850">
              {lesson.level} - {lesson.title}
            </h4>
            <p className="text-xs text-slate-500 capitalize">
              {lesson.category} • {lesson.xp_reward} XP
            </p>
          </div>
          <span className="bg-blue-50 text-blue-600 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider border border-blue-100">
            Active
          </span>
        </div>
      )}

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
            {sortedPhases.map((phase: any, sortedIdx: number) => {
              const originalIdx = editConfig.phases.findIndex((p: any) => p.phase_type === phase.phase_type)
              return (
                <div
                  key={phase.phase_type}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(sortedIdx)
                    e.dataTransfer.effectAllowed = "move"
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (draggedIndex === null || draggedIndex === sortedIdx) return

                    const newPhases = [...sortedPhases]
                    const draggedItem = newPhases[draggedIndex]
                    newPhases.splice(draggedIndex, 1)
                    newPhases.splice(sortedIdx, 0, draggedItem)

                    // Update sequential orders
                    newPhases.forEach((p, idx) => {
                      p.order = idx
                    })

                    // Map back to original phases array
                    const updatedOriginalPhases = [...editConfig.phases]
                    newPhases.forEach((p) => {
                      const origIdx = updatedOriginalPhases.findIndex((o) => o.phase_type === p.phase_type)
                      if (origIdx !== -1) {
                        updatedOriginalPhases[origIdx] = p
                      }
                    })

                    setDraggedIndex(sortedIdx)
                    setEditConfig({ ...editConfig, phases: updatedOriginalPhases })
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null)
                  }}
                  className={`relative group transition-all duration-200 ${
                    draggedIndex === sortedIdx
                      ? "opacity-40 scale-[0.98] border-2 border-dashed border-blue-500 rounded-xl bg-slate-50"
                      : ""
                  }`}
                >
                  <div className="absolute -left-7 top-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this phase?")) {
                          const newPhases = editConfig.phases.filter((_: any, i: number) => i !== originalIdx)
                          // Re-index remaining phases orders to stay sequential
                          newPhases.forEach((p: any, idx: number) => {
                            p.order = idx
                          })
                          setEditConfig({ ...editConfig, phases: newPhases })
                        }
                      }}
                      className="p-1 bg-white hover:bg-red-50 border border-slate-200 rounded-lg text-red-500 hover:text-red-700 transition-colors shadow-sm flex items-center justify-center h-7 w-7"
                      title="Delete Phase"
                    >
                      ✕
                    </button>
                  </div>
                  <PhaseEditor
                    phase={phase}
                    isTemplate={false}
                    onChange={(updated) => {
                      const phases = [...editConfig.phases]
                      phases[originalIdx] = updated
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
              )
            })}

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
                <option value="translation_drill">⌨️ Translation Drill</option>
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
