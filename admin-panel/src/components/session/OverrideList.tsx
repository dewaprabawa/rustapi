import React from 'react'
import { getId } from '../../lib/utils'

interface LessonSessionConfig {
  _id?: { $oid: string }
  lesson_id: string
  phases?: any[] | null
  override_lives?: number | null
  override_xp_multiplier?: number | null
  pronunciation_sentences?: string[] | null
  conversation_prompt?: string | null
}

interface OverrideListProps {
  configs: LessonSessionConfig[]
  onEdit: (cfg: LessonSessionConfig) => void
  onRemove: (id: string) => void
  getLessonTitle: (id: string) => string
}

export const OverrideList: React.FC<OverrideListProps> = ({
  configs,
  onEdit,
  onRemove,
  getLessonTitle
}) => {
  if (configs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
        No lesson overrides yet. All lessons inherit from their level template.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {configs.map((cfg) => (
        <div
          key={cfg.lesson_id}
          className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
        >
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {getLessonTitle(getId(cfg.lesson_id))}
            </p>
            <div className="flex gap-3 text-xs text-slate-500 mt-1">
              {cfg.override_lives && <span>❤️ {cfg.override_lives} lives</span>}
              {cfg.override_xp_multiplier && <span>⭐ {cfg.override_xp_multiplier}x</span>}
              {cfg.pronunciation_sentences?.length && (
                <span>🎤 {cfg.pronunciation_sentences.length} sentences</span>
              )}
              {cfg.conversation_prompt && <span>💬 Custom prompt</span>}
              {cfg.phases && <span>🔧 Custom phases</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit({ ...cfg })}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              Edit
            </button>
            <button
              onClick={() => onRemove(getId(cfg.lesson_id))}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
