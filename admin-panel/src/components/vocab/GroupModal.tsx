import React from 'react'
import { X, Save, Trash2, Loader2 } from 'lucide-react'

interface GroupModalProps {
  isOpen: boolean
  onClose: () => void
  selectedGroup: any
  onSave: (groupData: any) => void
  onDelete?: (id: string) => void
  isSaving: boolean
  isDeleting?: boolean
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  selectedGroup,
  onSave,
  onDelete,
  isSaving,
  isDeleting
}) => {
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    level: 'A1',
    color_theme: '#3b82f6',
    pos_type: ''
  })

  React.useEffect(() => {
    if (selectedGroup) {
      setFormData({
        title: selectedGroup.title || '',
        description: selectedGroup.description || '',
        level: selectedGroup.level || 'A1',
        color_theme: selectedGroup.color_theme || '#3b82f6',
        pos_type: selectedGroup.pos_type || ''
      })
    } else {
      setFormData({
        title: '',
        description: '',
        level: 'A1',
        color_theme: '#3b82f6',
        pos_type: ''
      })
    }
  }, [selectedGroup, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{selectedGroup ? 'Edit Group' : 'Create New Group'}</h3>
            <p className="text-xs text-slate-500">Organize your vocabulary sets into logical categories.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white border border-slate-100 rounded-xl transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-8 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Group Title</label>
              <input 
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                placeholder="e.g. Front Office Essentials"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
              <textarea 
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none min-h-[100px] resize-none"
                placeholder="Briefly describe what this group covers..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Target Level</label>
                <select 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: e.target.value})}
                >
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">POS Filter (Optional)</label>
                <select 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                  value={formData.pos_type}
                  onChange={e => setFormData({...formData, pos_type: e.target.value})}
                >
                  <option value="">Mixed</option>
                  <option value="verb">Verbs</option>
                  <option value="noun">Nouns</option>
                  <option value="adjective">Adjectives</option>
                  <option value="phrase">Phrases</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Theme Color</label>
              <div className="flex gap-3 flex-wrap">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'].map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData({...formData, color_theme: color})}
                    className={`h-10 w-10 rounded-full border-2 transition-all ${formData.color_theme === color ? 'border-slate-800 scale-110 shadow-lg' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {selectedGroup && onDelete && (
              <button
                onClick={() => {
                  if (window.confirm("Delete this group? Sets will not be deleted but will become ungrouped.")) {
                    onDelete(selectedGroup._id?.$oid || selectedGroup._id)
                  }
                }}
                disabled={isDeleting}
                className="p-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl transition-all disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
              </button>
            )}
            <button 
              disabled={isSaving || !formData.title}
              onClick={() => onSave(formData)}
              className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {selectedGroup ? 'Update Group' : 'Create Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
