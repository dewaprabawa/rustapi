import React from 'react'
import { 
  X, 
  Sparkles, 
  Loader2, 
  Save, 
  Trash2, 
  Volume2, 
  MessageSquare,
  Globe,
  BookOpen
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  previewData: any
  setPreviewData: (data: any) => void
  onSave: () => void
  isSaving: boolean
  playAudio: (text: string) => void
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  previewData,
  setPreviewData,
  onSave,
  isSaving,
  playAudio
}) => {
  if (!isOpen || !previewData) return null

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 lg:p-12 animate-in fade-in duration-500">
      <div className="bg-slate-50 rounded-[40px] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="px-10 py-8 bg-white border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <input 
                  className="text-2xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-80"
                  value={previewData.title}
                  onChange={e => setPreviewData({...previewData, title: e.target.value})}
                />
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-widest border border-emerald-200">AI Generated</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 font-medium uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> {previewData.language}</span>
                <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> {previewData.level}</span>
                <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> {previewData.topic}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
            >
              Discard
            </button>
            <button 
              onClick={onSave}
              disabled={isSaving}
              className="px-8 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {isSaving ? 'Saving to Library...' : 'Deploy to Library'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.isArray(previewData.words) && previewData.words.map((word: any, idx: number) => (
              <div key={idx} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <input 
                      className="font-bold text-slate-800 text-xl bg-transparent border-none focus:ring-0 p-0 w-full"
                      value={word.word}
                      onChange={e => {
                        const newWords = [...previewData.words]
                        newWords[idx].word = e.target.value
                        setPreviewData({...previewData, words: newWords})
                      }}
                    />
                    <input 
                      className="text-blue-600 font-bold bg-transparent border-none focus:ring-0 p-0 w-full text-sm"
                      value={word.translation}
                      onChange={e => {
                        const newWords = [...previewData.words]
                        newWords[idx].translation = e.target.value
                        setPreviewData({...previewData, words: newWords})
                      }}
                    />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => playAudio(word.word)}
                      className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors"
                      title="Listen to English pronunciation"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => {
                        const newWords = previewData.words.filter((_: any, i: number) => i !== idx);
                        setPreviewData({...previewData, words: newWords});
                      }}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phonetics</label>
                    <input 
                      className="w-full text-xs text-slate-600 italic bg-slate-50 border-none rounded-lg px-2 py-1"
                      value={word.pronunciation_guide}
                      onChange={e => {
                        const newWords = [...previewData.words]
                        newWords[idx].pronunciation_guide = e.target.value
                        setPreviewData({...previewData, words: newWords})
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Part of Speech</label>
                    <input 
                      className="w-full text-xs text-slate-600 bg-slate-50 border-none rounded-lg px-2 py-1"
                      value={word.part_of_speech}
                      onChange={e => {
                        const newWords = [...previewData.words]
                        newWords[idx].part_of_speech = e.target.value
                        setPreviewData({...previewData, words: newWords})
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> Cinematic Setup
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Card Type</label>
                      <select 
                        className="w-full text-[11px] bg-white border border-slate-200 rounded px-1.5 py-1 outline-none"
                        value={word.card_type || 'vocabulary'}
                        onChange={e => {
                          const newWords = [...previewData.words]
                          newWords[idx].card_type = e.target.value
                          setPreviewData({...previewData, words: newWords})
                        }}
                      >
                        <option value="vocabulary">Vocab</option>
                        <option value="phrase">Phrase</option>
                        <option value="listening">Listen</option>
                        <option value="speaking">Speak</option>
                        <option value="situation">Scene</option>
                        <option value="image">Image</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Emoji</label>
                      <input 
                        className="w-full text-[11px] bg-white border border-slate-200 rounded px-1.5 py-1 outline-none text-center"
                        value={word.emoji || '💡'}
                        onChange={e => {
                          const newWords = [...previewData.words]
                          newWords[idx].emoji = e.target.value
                          setPreviewData({...previewData, words: newWords})
                        }}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Emotion</label>
                      <input 
                        className="w-full text-[11px] bg-white border border-slate-200 rounded px-1.5 py-1 outline-none"
                        placeholder="e.g. angry"
                        value={word.emotion || ''}
                        onChange={e => {
                          const newWords = [...previewData.words]
                          newWords[idx].emotion = e.target.value
                          setPreviewData({...previewData, words: newWords})
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Natural Spoken Usage</label>
                    <textarea 
                      className="w-full text-xs text-slate-600 leading-relaxed bg-indigo-50/30 border-none rounded-xl px-3 py-2 min-h-[60px] resize-none mt-1"
                      value={word.colloquial_usage}
                      onChange={e => {
                        const newWords = [...previewData.words]
                        newWords[idx].colloquial_usage = e.target.value
                        setPreviewData({...previewData, words: newWords})
                      }}
                    />
                    <input 
                      className="w-full text-[11px] text-blue-600 bg-indigo-50/30 border-none rounded-lg px-3 py-1 outline-none mt-1"
                      placeholder="Translation for Spoken Usage"
                      value={word.colloquial_usage_id || ""}
                      onChange={e => {
                        const newWords = [...previewData.words]
                        newWords[idx].colloquial_usage_id = e.target.value
                        setPreviewData({...previewData, words: newWords})
                      }}
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Conversational Example</label>
                    <textarea 
                      className="w-full text-xs text-slate-600 italic bg-white border border-slate-100 rounded-lg px-3 py-2 min-h-[50px] resize-none"
                      value={word.example_sentence}
                      onChange={e => {
                        const newWords = [...previewData.words]
                        newWords[idx].example_sentence = e.target.value
                        setPreviewData({...previewData, words: newWords})
                      }}
                    />
                  </div>

                  {word.item_dialogue && (
                    <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                      <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-3">Item Dialogue Snippet</label>
                      {Array.isArray(word.item_dialogue) && word.item_dialogue.map((line: any, lidx: number) => (
                        <div key={lidx} className="mb-3 last:mb-0 space-y-1 group/pline">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400">{line.speaker}</span>
                            <button 
                              onClick={() => playAudio(line.text_en)}
                              className="p-1 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover/pline:opacity-100"
                              title="Listen"
                            >
                              <Volume2 className="h-3 w-3" />
                            </button>
                          </div>
                          <input 
                            className="w-full text-[11px] font-medium text-slate-700 bg-white/50 border-none rounded px-2 py-1"
                            value={line.text_en}
                            onChange={e => {
                              const newWords = [...previewData.words];
                              newWords[idx].item_dialogue[lidx].text_en = e.target.value;
                              setPreviewData({...previewData, words: newWords});
                            }}
                          />
                          <input 
                            className="w-full text-[11px] text-blue-600 bg-white/50 border-none rounded px-2 py-1"
                            value={line.text_id}
                            onChange={e => {
                              const newWords = [...previewData.words];
                              newWords[idx].item_dialogue[lidx].text_id = e.target.value;
                              setPreviewData({...previewData, words: newWords});
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {previewData.dialogue && previewData.dialogue.length > 0 && (
            <div className="mt-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-500" /> Example Conversation
              </h4>
              <div className="space-y-4">
                {previewData.dialogue.map((line: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-1 p-3 bg-slate-50 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">{line.speaker}</span>
                      <button 
                        onClick={() => playAudio(line.text_en)}
                        className="p-1 text-slate-300 hover:text-blue-600 transition-colors"
                        title="Listen to English pronunciation"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input 
                      className="font-medium text-slate-800 bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                      value={line.text_en}
                      onChange={e => {
                        const newDialogue = [...previewData.dialogue!]
                        newDialogue[idx].text_en = e.target.value
                        setPreviewData({...previewData, dialogue: newDialogue})
                      }}
                    />
                    <input 
                      className="text-blue-600 font-medium bg-transparent border-none focus:ring-0 p-0 text-sm w-full"
                      value={line.text_id}
                      onChange={e => {
                        const newDialogue = [...previewData.dialogue!]
                        newDialogue[idx].text_id = e.target.value
                        setPreviewData({...previewData, dialogue: newDialogue})
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewData.branching_tree && (
            <div className="mt-8 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" /> Offline Branching Tree
                </h4>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider border border-emerald-500/20">
                  Editable Logic
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Modify the JSON below to refine the interactive offline paths.
              </p>
              <div className="bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
                <textarea 
                  className="w-full text-[10px] font-mono text-emerald-300/80 bg-transparent p-4 outline-none min-h-[300px] leading-relaxed resize-y"
                  value={typeof previewData.branching_tree === 'string' ? previewData.branching_tree : JSON.stringify(previewData.branching_tree, null, 2)}
                  onChange={e => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      setPreviewData({...previewData, branching_tree: parsed})
                    } catch (err) {
                      setPreviewData({...previewData, branching_tree: e.target.value})
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
