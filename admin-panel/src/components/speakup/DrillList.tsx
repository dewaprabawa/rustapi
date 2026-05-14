import React from 'react'
import { Play, Settings2, Trash2, Mic, TextCursorInput, ChevronRight } from 'lucide-react'
import { cn, getId } from '../../lib/utils'

interface DrillListProps {
  filteredContents: any[]
  activeTab: 'shadowing' | 'expansion'
  onEdit: (item: any) => void
  onDelete: (id: string) => void
  onSimulate: (item: any) => void
  onAddFirst: () => void
}

export const DrillList: React.FC<DrillListProps> = ({
  filteredContents,
  activeTab,
  onEdit,
  onDelete,
  onSimulate,
  onAddFirst
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {filteredContents.map((item: any) => (
        <div key={getId(item)} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all group relative">
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={() => onSimulate(item)}
              className="p-2 bg-violet-50 text-violet-400 hover:text-violet-600 rounded-xl transition-colors border border-violet-100 hover:border-violet-200"
              title="Simulate drill"
            >
              <Play className="h-4 w-4" />
            </button>
            <button 
              onClick={() => onEdit(item)}
              className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors border border-slate-100 hover:border-blue-200"
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <button 
              onClick={() => {
                if (window.confirm("Delete this drill?")) {
                  onDelete(getId(item))
                }
              }}
              className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors border border-slate-100 hover:border-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center",
              activeTab === 'shadowing' ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600"
            )}>
              {activeTab === 'shadowing' ? <Mic className="h-6 w-6" /> : <TextCursorInput className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.difficulty}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{item.target_wpm} WPM Goal</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">{item.title}</h3>
              {item.title_id && <p className="text-xs text-slate-500 font-medium">{item.title_id}</p>}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <p className="text-slate-600 text-sm italic font-medium">"{item.transcript}"</p>
            {item.transcript_id && <p className="text-xs text-slate-400 mt-2 italic font-medium">({item.transcript_id})</p>}
          </div>

          {item.steps && item.steps.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progressive Steps</p>
              {Array.isArray(item.steps) && item.steps.map((step: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
                  <ChevronRight className="h-3 w-3 text-teal-400" />
                  <span className="truncate">{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {filteredContents.length === 0 && (
        <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <p className="text-slate-400 font-medium">No {activeTab} drills found.</p>
          <button 
            onClick={onAddFirst}
            className="mt-4 text-blue-600 font-bold hover:underline"
          >
            Create your first one
          </button>
        </div>
      )}
    </div>
  )
}
