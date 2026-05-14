import React from 'react'
import { PhaseEditor } from './PhaseEditor'

interface ConfigModalProps {
  editConfig: any
  setEditConfig: (cfg: any) => void
  lessons: any[]
  templates: any[]
  onSave: () => void
  saving: boolean
  activeVocab: any[]
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
  onLessonUpdate,
  onVocabUpdate,
  onOverrideUpdate
}) => {
  if (!editConfig) return null

  const lesson = lessons.find(l => (l._id?.$oid || l._id) === editConfig.lesson_id)
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
            {lessons.map((l: any) => (
              <option key={l._id?.$oid || l._id} value={l._id?.$oid || l._id}>
                {l.title}
              </option>
            ))}
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
          editConfig.phases.map((phase: any, idx: number) => (
            <PhaseEditor
              key={idx}
              phase={phase}
              onChange={(updated) => {
                const phases = [...editConfig.phases]
                phases[idx] = updated
                setEditConfig({ ...editConfig, phases })
              }}
              lesson={lesson}
              vocabulary={activeVocab}
              onLessonUpdate={onLessonUpdate}
              onVocabUpdate={onVocabUpdate}
              onOverrideUpdate={onOverrideUpdate}
            />
          ))
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
