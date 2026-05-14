import React from 'react'
import { 
  Globe, 
  BookOpen, 
  Sparkles, 
  Loader2, 
  Trash2, 
  Save, 
  Edit2, 
  Volume2, 
  MessageSquare,
  Search
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface VocabSetDetailProps {
  selectedSet: any
  setSelectedSet: (set: any) => void
  selectedWords: any[]
  setSelectedWords: (words: any[]) => void
  isEditingSet: boolean
  setIsEditingSet: (isEditing: boolean) => void
  editingWordId: string | null
  setEditingWordId: (id: string | null) => void
  savingEdit: boolean
  handleUpdateSet: () => void
  handleUpdateWord: (word: any) => void
  onDeleteSet: (id: string) => void
  onDeleteWord: (setId: string, wordId: string) => void
  playAudio: (text: string) => void
  isDeletingSet: boolean
}

export const VocabSetDetail: React.FC<VocabSetDetailProps> = ({
  selectedSet,
  setSelectedSet,
  selectedWords,
  setSelectedWords,
  isEditingSet,
  setIsEditingSet,
  editingWordId,
  setEditingWordId,
  savingEdit,
  handleUpdateSet,
  handleUpdateWord,
  onDeleteSet,
  onDeleteWord,
  playAudio,
  isDeletingSet
}) => {
  if (!selectedSet) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
        <div className="flex flex-col items-center justify-center h-full text-slate-300 p-12 text-center">
          <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Search className="h-12 w-12 opacity-20" />
          </div>
          <h4 className="text-xl font-bold text-slate-400">Select a set to view details</h4>
          <p className="text-sm mt-2 max-w-xs">Review the vocabulary, translations, and AI-generated speaking contexts.</p>
        </div>
      </div>
    )
  }

  const setId = selectedSet._id?.$oid || selectedSet._id

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-4">
            {isEditingSet ? (
              <div className="space-y-3">
                <input 
                  className="text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={selectedSet.title}
                  onChange={e => setSelectedSet({...selectedSet, title: e.target.value})}
                />
                <div className="flex gap-4">
                  <input 
                    className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none"
                    value={selectedSet.topic}
                    placeholder="Topic"
                    onChange={e => setSelectedSet({...selectedSet, topic: e.target.value})}
                  />
                  <select 
                    className="w-24 text-sm bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none"
                    value={selectedSet.level}
                    onChange={e => setSelectedSet({...selectedSet, level: e.target.value})}
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-slate-800">{selectedSet.title}</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                    {selectedSet.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-slate-400" /> {selectedSet.language}</span>
                  <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-slate-400" /> {selectedSet.level}</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-slate-400" /> {selectedSet.topic}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {isEditingSet ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditingSet(false)}
                  className="px-4 py-2 text-slate-500 font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateSet}
                  disabled={savingEdit}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditingSet(true)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Edit Info
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this vocabulary set? All associated words will also be removed.")) {
                      onDeleteSet(setId);
                    }
                  }}
                  disabled={isDeletingSet}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isDeletingSet ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.isArray(selectedWords) && selectedWords.map((word, idx) => {
            const wordId = word._id?.$oid || word._id
            const isEditing = editingWordId === wordId

            return (
              <div key={idx} className={cn(
                "p-5 rounded-2xl border transition-all duration-300 group",
                isEditing ? "bg-blue-50/50 border-blue-200 ring-4 ring-blue-500/5 shadow-xl" : "border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-md"
              )}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input 
                            className="flex-1 font-bold text-slate-800 text-lg bg-white border border-slate-200 rounded-lg px-3 py-1 outline-none"
                            value={word.word}
                            onChange={e => {
                              const newWords = [...selectedWords]
                              newWords[idx].word = e.target.value
                              setSelectedWords(newWords)
                            }}
                          />
                          <input 
                            className="w-24 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1"
                            value={word.part_of_speech}
                            onChange={e => {
                              const newWords = [...selectedWords]
                              newWords[idx].part_of_speech = e.target.value
                              setSelectedWords(newWords)
                            }}
                          />
                        </div>
                        <input 
                          className="w-full text-blue-600 font-medium bg-white border border-slate-200 rounded-lg px-3 py-1 outline-none text-sm"
                          value={word.translation}
                          onChange={e => {
                            const newWords = [...selectedWords]
                            newWords[idx].translation = e.target.value
                            setSelectedWords(newWords)
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <h5 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          {word.word}
                          <span className="text-xs font-normal text-slate-400">({word.part_of_speech})</span>
                        </h5>
                        <p className="text-blue-600 font-medium">{word.translation}</p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setEditingWordId(null)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleUpdateWord(word)}
                          disabled={savingEdit}
                          className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20"
                        >
                          {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => setEditingWordId(wordId)}
                          className="p-2 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit word"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); playAudio(word.word); }}
                          className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                          title="Listen to English pronunciation"
                        >
                          <Volume2 className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (window.confirm("Delete this word from the set?")) {
                              onDeleteWord(setId, wordId);
                            }
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete word"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">IPA</span>
                        <input 
                          className="flex-1 text-xs text-slate-600 italic bg-white border border-slate-200 rounded px-2 py-1"
                          value={word.pronunciation_guide}
                          onChange={e => {
                            const newWords = [...selectedWords]
                            newWords[idx].pronunciation_guide = e.target.value
                            setSelectedWords(newWords)
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 text-[10px] font-bold rounded uppercase">SPOKEN</span>
                        <textarea 
                          className="w-full text-xs text-slate-600 leading-relaxed bg-white border border-slate-200 rounded-lg px-3 py-2 min-h-[60px] resize-none"
                          value={word.colloquial_usage}
                          onChange={e => {
                            const newWords = [...selectedWords]
                            newWords[idx].colloquial_usage = e.target.value
                            setSelectedWords(newWords)
                          }}
                        />
                        <input 
                          className="w-full text-[11px] text-blue-600 bg-white border border-slate-200 rounded-lg px-3 py-1 outline-none"
                          placeholder="Translation for Spoken Usage"
                          value={word.colloquial_usage_id || ""}
                          onChange={e => {
                            const newWords = [...selectedWords]
                            newWords[idx].colloquial_usage_id = e.target.value
                            setSelectedWords(newWords)
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">EXAMPLE</span>
                        <textarea 
                          className="w-full text-xs text-slate-600 italic bg-white border border-slate-200 rounded-lg px-3 py-2 min-h-[50px] resize-none"
                          value={word.example_sentence}
                          onChange={e => {
                            const newWords = [...selectedWords]
                            newWords[idx].example_sentence = e.target.value
                            setSelectedWords(newWords)
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase mt-0.5">IPA</span>
                        <p className="text-xs text-slate-600 italic">{word.pronunciation_guide}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 text-[10px] font-bold rounded uppercase mt-0.5">SPOKEN</span>
                          <p className="text-xs text-slate-600 leading-relaxed">{word.colloquial_usage}</p>
                        </div>
                        {word.colloquial_usage_id && (
                          <p className="text-[11px] text-blue-600/70 ml-14 italic">{word.colloquial_usage_id}</p>
                        )}
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 italic">"{word.example_sentence}"</p>
                      </div>
                    </>
                  )}

                  <div className="pt-3 border-t border-slate-100/50 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-amber-500" /> Cinematic Setup
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Type</label>
                        <div className="px-2 py-1 bg-slate-100 rounded text-[11px] font-bold text-slate-600 border border-slate-200">
                          {word.card_type?.toUpperCase() || 'VOCABULARY'}
                        </div>
                      </div>
                      <div className="w-12">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Emoji</label>
                        <div className="h-7 flex items-center justify-center bg-slate-100 rounded border border-slate-200 text-lg">
                          {word.emoji || '💡'}
                        </div>
                      </div>
                      {word.emotion && (
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Emotion</label>
                          <div className="px-2 py-1 bg-rose-50 rounded text-[11px] font-bold text-rose-600 border border-rose-100">
                            {word.emotion.toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {Array.isArray(word.item_dialogue) && word.item_dialogue.length > 0 && (
                    <div className="mt-2 pt-3 border-t border-slate-100/50 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" /> Context Dialogue
                      </p>
                      {word.item_dialogue.map((line: any, lidx: number) => (
                        <div key={lidx} className="text-[11px] leading-snug flex justify-between items-start group/line">
                          <div>
                            <span className="font-bold text-slate-500">{line.speaker}: </span>
                            <span className="text-slate-700">{line.text_en}</span>
                            <p className="text-blue-600/70 ml-4 italic">{line.text_id}</p>
                          </div>
                          <button 
                            onClick={() => playAudio(line.text_en)}
                            className="p-1 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover/line:opacity-100"
                            title="Listen"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-500" /> Example Conversation
          </h4>
          {Array.isArray(selectedSet.example_dialogue) && selectedSet.example_dialogue.length > 0 ? (
            <div className="space-y-4">
              {selectedSet.example_dialogue.map((line: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-1 p-3 bg-slate-50 rounded-2xl">
                  {isEditingSet ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <input 
                          className="text-xs font-bold text-slate-500 uppercase bg-white border border-slate-200 rounded px-2 py-0.5"
                          value={line.speaker}
                          onChange={e => {
                            const newDialogue = [...(selectedSet.example_dialogue || [])]
                            newDialogue[idx].speaker = e.target.value
                            setSelectedSet({...selectedSet, example_dialogue: newDialogue})
                          }}
                        />
                        <button 
                          onClick={() => playAudio(line.text_en)}
                          className="p-1 text-slate-300 hover:text-blue-600 transition-colors"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      <input 
                        className="w-full font-medium text-slate-800 text-sm bg-white border border-slate-200 rounded px-3 py-1 outline-none"
                        value={line.text_en}
                        onChange={e => {
                          const newDialogue = [...(selectedSet.example_dialogue || [])]
                          newDialogue[idx].text_en = e.target.value
                          setSelectedSet({...selectedSet, example_dialogue: newDialogue})
                        }}
                      />
                      <input 
                        className="w-full text-blue-600 font-medium text-sm bg-white border border-slate-200 rounded px-3 py-1 outline-none"
                        value={line.text_id}
                        onChange={e => {
                          const newDialogue = [...(selectedSet.example_dialogue || [])]
                          newDialogue[idx].text_id = e.target.value
                          setSelectedSet({...selectedSet, example_dialogue: newDialogue})
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500 uppercase">{line.speaker}</span>
                        <button 
                          onClick={() => playAudio(line.text_en)}
                          className="p-1 text-slate-300 hover:text-blue-600 transition-colors"
                          title="Listen to English pronunciation"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="font-medium text-slate-800 text-sm">{line.text_en}</p>
                      <p className="text-blue-600 font-medium text-sm">{line.text_id}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-xl border border-slate-100">
              No conversation generated for this set.
            </div>
          )}
        </div>

        {selectedSet.branching_tree && (
          <div className="mt-8 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" /> Offline Branching Tree
              </h4>
              {isEditingSet && (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider border border-emerald-500/20">
                  Editable Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Refine the interactive decision paths for offline practice.
            </p>
            <div className="bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
              <textarea 
                disabled={!isEditingSet}
                className={cn(
                  "w-full text-[10px] font-mono p-4 outline-none min-h-[300px] leading-relaxed resize-y bg-transparent",
                  isEditingSet ? "text-emerald-300/80 cursor-text" : "text-slate-500 cursor-not-allowed"
                )}
                value={typeof selectedSet.branching_tree === 'string' ? selectedSet.branching_tree : JSON.stringify(selectedSet.branching_tree, null, 2)}
                onChange={e => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setSelectedSet({...selectedSet, branching_tree: parsed})
                  } catch (err) {
                    setSelectedSet({...selectedSet, branching_tree: e.target.value})
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
