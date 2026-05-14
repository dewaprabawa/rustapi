import React from 'react'
import { Trash2 } from 'lucide-react'

interface LevelTemplate {
  _id?: { $oid: string }
  level: string
  name: string
  default_lives: number
  xp_multiplier: number
  phases: any[]
}

interface TemplateListProps {
  templates: LevelTemplate[]
  onEdit: (t: LevelTemplate) => void
}

export const TemplateList: React.FC<TemplateListProps> = ({ templates, onEdit }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {templates.map((t) => (
        <div
          key={t.level}
          className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all group cursor-pointer"
          onClick={() => onEdit(t)}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold">
              {t.level}
            </div>
            <div className="flex gap-3 text-right">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lives</p>
                <p className="text-xs font-bold text-slate-700">{t.default_lives}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">XP</p>
                <p className="text-xs font-bold text-blue-600">{t.xp_multiplier}x</p>
              </div>
            </div>
          </div>
          <h3 className="font-bold text-slate-800">{t.name}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {t.phases.filter((p) => p.enabled).length} active phases
          </p>
          <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-bold text-blue-600 uppercase">Click to edit</span>
          </div>
        </div>
      ))}
    </div>
  )
}
