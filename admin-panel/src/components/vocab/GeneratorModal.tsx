import React from 'react'
import { X, Globe, Sparkles, Loader2 } from 'lucide-react'

interface GeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  builderForm: {
    topic: string
    level: string
    word_count: number
    dialogue_sentence_count: number
    language: string
    set_type: string
    part_of_speech: string
    group_id: string
    prompt_override?: string
  }
  setBuilderForm: (form: any) => void
  hospitalityTopics: string[]
  vocabGroups: any[]
  onGenerate: () => void
  isGenerating: boolean
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({
  isOpen,
  onClose,
  builderForm,
  setBuilderForm,
  hospitalityTopics,
  vocabGroups,
  onGenerate,
  isGenerating
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-800">VocabForge Builder</h3>
            <p className="text-xs text-slate-500">Configure your AI vocabulary generation parameters.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white border border-slate-100 rounded-xl transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Content Type</label>
                <select 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                  value={builderForm.set_type}
                  onChange={e => setBuilderForm({...builderForm, set_type: e.target.value})}
                >
                  <option value="vocabulary">Standard Vocabulary</option>
                  <option value="phrasal_verbs">Phrasal Verbs & Collocations</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Target Topic</label>
                <input 
                  type="text"
                  list="hospitality-topics"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none placeholder:text-slate-400"
                  placeholder={builderForm.set_type === 'phrasal_verbs' ? "e.g. Workplace, Dating, Travel..." : "e.g. Front Desk, Housekeeping..."}
                  value={builderForm.topic}
                  onChange={e => setBuilderForm({...builderForm, topic: e.target.value})}
                />
              </div>
            </div>
              <datalist id="hospitality-topics">
                {hospitalityTopics.map(topic => (
                  <option key={topic} value={topic} />
                ))}
              </datalist>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">CEFR Level</label>
                <select 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                  value={builderForm.level}
                  onChange={e => setBuilderForm({...builderForm, level: e.target.value})}
                >
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                    <option key={lvl} value={lvl}>{lvl} - {lvl === 'A1' ? 'Beginner' : lvl === 'B1' ? 'Intermediate' : 'Advanced'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Word Count</label>
                <input 
                  type="number"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                  value={builderForm.word_count}
                  onChange={e => setBuilderForm({...builderForm, word_count: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Sentences</label>
                <input 
                  type="number"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                  value={builderForm.dialogue_sentence_count}
                  onChange={e => setBuilderForm({...builderForm, dialogue_sentence_count: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Part of Speech (Optional)</label>
                <select 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                  value={builderForm.part_of_speech}
                  onChange={e => setBuilderForm({...builderForm, part_of_speech: e.target.value})}
                >
                  <option value="">All Types</option>
                  <option value="verb">Verbs</option>
                  <option value="noun">Nouns</option>
                  <option value="adjective">Adjectives</option>
                  <option value="adverb">Adverbs</option>
                  <option value="phrase">Phrases</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Assign to Group</label>
                <select 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none"
                  value={builderForm.group_id}
                  onChange={e => setBuilderForm({...builderForm, group_id: e.target.value})}
                >
                  <option value="">No Group</option>
                  {vocabGroups.map((g: any) => (
                    <option key={g._id?.$oid || g._id} value={g._id?.$oid || g._id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Target Language</label>
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900">{builderForm.language}</p>
                  <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Default System Language</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Prompt Override (Optional)</label>
              <textarea 
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-800 outline-none text-sm min-h-[100px] placeholder:text-slate-400"
                placeholder="Add custom instructions for the AI (e.g., 'Focus on formal expressions', 'Include slang', etc.)"
                value={builderForm.prompt_override || ""}
                onChange={e => setBuilderForm({...builderForm, prompt_override: e.target.value})}
              />
              <p className="text-[10px] text-slate-400 mt-1 italic">This override only applies to the current generation and will not persist in global settings.</p>
            </div>
          </div>

          <button 
            disabled={isGenerating || !builderForm.topic}
            onClick={onGenerate}
            className="w-full py-4 bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3"
          >
            {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 text-amber-400" />}
            {isGenerating ? 'AI is Curating...' : 'Unleash VocabForge AI'}
          </button>
        </div>
      </div>
    </div>
  )
}
