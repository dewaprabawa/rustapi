import React from 'react'
import { PhaseEditor } from './PhaseEditor'

interface TemplateModalProps {
  editTemplate: any
  setEditTemplate: (t: any) => void
  onSave: () => void
  saving: boolean
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  editTemplate,
  setEditTemplate,
  onSave,
  saving
}) => {
  if (!editTemplate) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Edit {editTemplate.level} Template</h3>
        <button onClick={() => setEditTemplate(null)} className="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Display Name</label>
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={editTemplate.name}
            onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Default Lives</label>
            <input
              type="number"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={editTemplate.default_lives}
              onChange={(e) => setEditTemplate({ ...editTemplate, default_lives: +e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">XP Multiplier</label>
            <input
              type="number"
              step="0.1"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={editTemplate.xp_multiplier}
              onChange={(e) => setEditTemplate({ ...editTemplate, xp_multiplier: +e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-700">Phases</h4>
        {[...editTemplate.phases]
          .sort((a, b) => a.order - b.order)
          .map((phase) => {
            const originalIdx = editTemplate.phases.findIndex((p:any) => p.phase_type === phase.phase_type);
            return (
              <PhaseEditor
                key={phase.phase_type}
                phase={phase}
                onChange={(updated) => {
                  const phases = [...editTemplate.phases]
                  phases[originalIdx] = updated
                  setEditTemplate({ ...editTemplate, phases })
                }}
              />
            );
          })}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Template"}
        </button>
        <button
          onClick={() => setEditTemplate(null)}
          className="px-6 py-2.5 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
