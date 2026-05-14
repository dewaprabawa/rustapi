import React, { useState } from 'react'
import { X, Sparkles, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { enrichVocabWord } from '../../services/api'

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (preview: any) => void
  level: string
  language: string
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  level,
  language
}) => {
  const [title, setTitle] = useState('')
  const [titleId, setTitleId] = useState('')
  const [words, setWords] = useState<any[]>([])
  const [isEnriching, setIsEnriching] = useState<number | null>(null)

  if (!isOpen) return null

  const addEmptyWord = () => {
    setWords([...words, {
      word: '',
      translation: '',
      part_of_speech: 'noun',
      definition: '',
      pronunciation_guide: '',
      colloquial_usage: '',
      colloquial_usage_id: '',
      example_sentence: '',
      distractors: ['', '', ''],
      card_type: 'vocabulary',
      emoji: '💡',
      emotion: 'neutral'
    }])
  }

  const removeWord = (idx: number) => {
    setWords(words.filter((_, i) => i !== idx))
  }

  const updateWord = (idx: number, field: string, value: any) => {
    const newWords = [...words]
    newWords[idx][field] = value
    setWords(newWords)
  }

  const handleMagicFill = async (idx: number) => {
    const wordText = words[idx].word
    if (!wordText) return

    setIsEnriching(idx)
    try {
      const enriched = await enrichVocabWord({
        word: wordText,
        level,
        target_language: language,
        part_of_speech: words[idx].part_of_speech
      })
      
      const newWords = [...words]
      newWords[idx] = enriched
      setWords(newWords)
    } catch (error) {
      alert("Magic Fill failed for this word.")
    } finally {
      setIsEnriching(null)
    }
  }

  const handleDeploy = () => {
    if (!title || words.length === 0) {
      alert("Please provide a title and at least one word.")
      return
    }
    onSave({
      title,
      title_id: titleId || title,
      words,
      dialogue: [],
      related_topics: []
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-6 h-6 text-indigo-500" />
              Manual Vocab Entry
            </h2>
            <p className="text-slate-500 text-sm mt-1 text-balance">Create a custom set manually. Use Magic Fill to auto-complete fields.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Set Title (English)</label>
              <input 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
                placeholder="e.g. Hotel Check-in"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Title Translation ({language})</label>
              <input 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
                placeholder="Translation of title"
                value={titleId}
                onChange={e => setTitleId(e.target.value)}
              />
            </div>
          </div>

          {/* Words List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-700">Vocabulary Words</h3>
              <button 
                onClick={addEmptyWord}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Word
              </button>
            </div>

            {words.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                <p className="text-slate-400 text-sm">No words added yet. Click "Add Word" to start.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {words.map((word, idx) => (
                  <div key={idx} className="group relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                    {/* Floating Delete Button */}
                    <button 
                      onClick={() => removeWord(idx)}
                      className="absolute -top-3 -right-3 p-2 bg-rose-50 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-12 gap-6">
                      {/* Main Info */}
                      <div className="col-span-12 lg:col-span-4 space-y-4">
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Word</label>
                            <div className="relative">
                              <input 
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                value={word.word}
                                onChange={e => updateWord(idx, 'word', e.target.value)}
                              />
                              <button 
                                onClick={() => handleMagicFill(idx)}
                                disabled={!word.word || isEnriching !== null}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-slate-200 transition-colors"
                                title="Magic Fill with AI"
                              >
                                {isEnriching === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Translation</label>
                          <input 
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            value={word.translation}
                            onChange={e => updateWord(idx, 'translation', e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">POS</label>
                            <select 
                              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                              value={word.part_of_speech}
                              onChange={e => updateWord(idx, 'part_of_speech', e.target.value)}
                            >
                              <option value="noun">Noun</option>
                              <option value="verb">Verb</option>
                              <option value="adjective">Adjective</option>
                              <option value="adverb">Adverb</option>
                              <option value="phrase">Phrase</option>
                              <option value="phrasal verb">Phrasal Verb</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">IPA/Pronunciation</label>
                            <input 
                              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm italic focus:ring-2 focus:ring-indigo-500/20 outline-none"
                              value={word.pronunciation_guide}
                              onChange={e => updateWord(idx, 'pronunciation_guide', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Definition</label>
                            <textarea 
                              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs leading-relaxed min-h-[60px] resize-none focus:ring-2 focus:ring-indigo-500/20 outline-none"
                              value={word.definition}
                              onChange={e => updateWord(idx, 'definition', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Spoken Usage</label>
                            <textarea 
                              className="w-full bg-indigo-50/30 border-none rounded-xl px-4 py-3 text-xs leading-relaxed min-h-[60px] resize-none focus:ring-2 focus:ring-indigo-500/20 outline-none"
                              value={word.colloquial_usage}
                              onChange={e => updateWord(idx, 'colloquial_usage', e.target.value)}
                            />
                            <input 
                              className="w-full bg-indigo-50/30 border-none rounded-lg px-4 py-2 text-[11px] text-blue-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                              placeholder="Spoken translation"
                              value={word.colloquial_usage_id}
                              onChange={e => updateWord(idx, 'colloquial_usage_id', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Example Sentence</label>
                            <textarea 
                              className="w-full bg-emerald-50/30 border-none rounded-xl px-4 py-3 text-xs italic leading-relaxed min-h-[60px] resize-none focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              value={word.example_sentence}
                              onChange={e => updateWord(idx, 'example_sentence', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Distractors</label>
                            <div className="grid grid-cols-3 gap-2">
                              {word.distractors.map((d: string, dIdx: number) => (
                                <input 
                                  key={dIdx}
                                  className="w-full bg-rose-50/30 border-none rounded-lg px-3 py-2 text-[11px] focus:ring-2 focus:ring-rose-500/20 outline-none"
                                  value={d}
                                  onChange={e => {
                                    const newD = [...word.distractors]
                                    newD[dIdx] = e.target.value
                                    updateWord(idx, 'distractors', newD)
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Emoji</label>
                              <input 
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm text-center focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                value={word.emoji}
                                onChange={e => updateWord(idx, 'emoji', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Emotion</label>
                              <select 
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                                value={word.emotion}
                                onChange={e => updateWord(idx, 'emotion', e.target.value)}
                              >
                                <option value="neutral">Neutral</option>
                                <option value="happy">Happy</option>
                                <option value="sad">Sad</option>
                                <option value="angry">Angry</option>
                                <option value="confused">Confused</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-slate-400 text-xs">
            {words.length} words added.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleDeploy}
              disabled={words.length === 0}
              className="flex items-center gap-2 px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:bg-slate-200 disabled:shadow-none active:scale-95"
            >
              <Save className="w-5 h-5" /> Deploy to Library
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
