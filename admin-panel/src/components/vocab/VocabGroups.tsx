import React from 'react'
import { Plus, Loader2, BookOpen, Globe, Edit2 } from 'lucide-react'

interface VocabGroup {
  _id: any
  title: string
  description: string
  level: string
  color_theme: string
  pos_type?: string
}

interface VocabGroupsProps {
  vocabGroups: VocabGroup[]
  vocabSets: any[]
  isLoading: boolean
  onNewGroup: () => void
  onEditGroup: (group: VocabGroup) => void
}

export const VocabGroups: React.FC<VocabGroupsProps> = ({
  vocabGroups,
  vocabSets,
  isLoading,
  onNewGroup,
  onEditGroup
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">Content Groups</h3>
        <button 
          onClick={onNewGroup}
          className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Group
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading groups...</p>
          </div>
        ) : vocabGroups.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <BookOpen className="h-12 w-12 opacity-10" />
            <p>No groups created yet.</p>
          </div>
        ) : (
          vocabGroups.map((group) => {
            const groupId = group._id?.$oid || group._id;
            return (
              <div key={groupId} className="group relative bg-white p-6 rounded-[32px] border border-slate-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-100" style={{ backgroundColor: group.color_theme + '15', color: group.color_theme }}>
                    <Globe className="h-6 w-6" />
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => onEditGroup(group)}
                      className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">{group.title}</h4>
                <p className="text-sm text-slate-500 mb-6 line-clamp-2">{group.description}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase">
                      {group.level}
                    </span>
                    {group.pos_type && (
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase">
                        {group.pos_type}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {vocabSets.filter((s: any) => s.group_id === groupId).length} Sets
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  )
}
