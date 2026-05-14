import React from 'react'
import { X, Loader2, Sparkles, Target, Info, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DrillModalProps {
  isOpen: boolean
  onClose: () => void
  editingItem: any
  activeTab: 'shadowing' | 'expansion'
  formData: any
  setFormData: (data: any) => void
  hospitalityTopics: string[]
  onAiGenerate: () => void
  isAiGenerating: boolean
  isAiSuccess: boolean
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
}

export const DrillModal: React.FC<DrillModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  activeTab,
  formData,
  setFormData,
  hospitalityTopics,
  onAiGenerate,
  isAiGenerating,
  isAiSuccess,
  onSubmit,
  isSubmitting
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">
              {editingItem ? 'Edit Drill' : `New ${activeTab === 'shadowing' ? 'Shadowing' : 'Expansion'} Drill`}
            </h3>
            <p className="text-slate-500 text-sm mt-1">Configure fluency practice content.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title (English)</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input 
                    required
                    list="hospitality-topics"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
                    placeholder="Select or type..."
                  />
                  <datalist id="hospitality-topics">
                    {hospitalityTopics.map(topic => (
                      <option key={topic} value={topic} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title (Indonesian)</label>
              <input 
                value={formData.title_id}
                onChange={e => setFormData({...formData, title_id: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
                placeholder="Translation..."
              />
            </div>

            <div className="col-span-2 flex justify-end">
              <button
                type="button"
                onClick={onAiGenerate}
                disabled={isAiGenerating}
                className={cn(
                  "px-8 py-3 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm shadow-sm",
                  isAiGenerating 
                    ? "bg-slate-100 text-slate-400 border-slate-200" 
                    : "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 shadow-amber-200/20"
                )}
              >
                {isAiGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isAiGenerating ? "Generating Content..." : "Generate with AI Magic"}
              </button>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Transcript (English)</label>
                {isAiSuccess && (
                  <span className="text-[10px] font-bold text-green-500 flex items-center gap-1 animate-pulse">
                    <Check className="h-3 w-3" /> English Ready
                  </span>
                )}
              </div>
              <textarea 
                required
                value={formData.transcript}
                onChange={e => setFormData({...formData, transcript: e.target.value})}
                className={cn(
                  "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[120px] font-medium text-slate-600 text-sm",
                  isAiSuccess ? "border-green-200 bg-green-50/10" : "border-slate-100"
                )}
                placeholder="English sentence..."
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Transcript (Indonesian)</label>
                {isAiSuccess && (
                  <span className="text-[10px] font-bold text-green-500 flex items-center gap-1 animate-pulse">
                    <Check className="h-3 w-3" /> Translation Ready
                  </span>
                )}
              </div>
              <textarea 
                value={formData.transcript_id}
                onChange={e => setFormData({...formData, transcript_id: e.target.value})}
                className={cn(
                  "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[120px] font-medium text-slate-600 text-sm",
                  isAiSuccess ? "border-green-200 bg-green-50/10" : "border-slate-100"
                )}
                placeholder="Indonesian translation..."
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Difficulty</label>
              <select 
                value={formData.difficulty}
                onChange={e => setFormData({...formData, difficulty: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Target WPM</label>
              <input 
                type="number"
                value={formData.target_wpm}
                onChange={e => setFormData({...formData, target_wpm: parseInt(e.target.value)})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700"
              />
            </div>

            {activeTab === 'shadowing' && (
              <div className="col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Target className="h-3 w-3" /> Native Audio URL (MP3)
                </label>
                <input 
                  value={formData.audio_url}
                  onChange={e => setFormData({...formData, audio_url: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-mono"
                  placeholder="https://example.com/audio.mp3"
                />
              </div>
            )}

            {activeTab === 'expansion' && (
              <div className="col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Info className="h-3 w-3" /> Progressive Steps (One per line)
                </label>
                <textarea 
                  value={formData.steps}
                  onChange={e => setFormData({...formData, steps: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[150px] text-sm"
                  placeholder="Welcome&#10;Welcome to our hotel&#10;Welcome to our hotel, how can I help you?"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-8 py-4 border-2 border-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>{editingItem ? 'Update Drill' : 'Create Drill'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
