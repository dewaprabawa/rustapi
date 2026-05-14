import React from 'react'
import { X, Loader2, Sparkles, Save } from 'lucide-react'
import { cn } from '../../lib/utils'

interface GameModalProps {
  isOpen: boolean
  onClose: () => void
  editingGameId: string | null
  formData: any
  setFormData: (data: any) => void
  onAiGenerate: () => void
  isGeneratingAI: boolean
  lessons: any[]
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isUploading: boolean
  onSubmit: () => void
  isSubmitting: boolean
}

export const GameModal: React.FC<GameModalProps> = ({
  isOpen,
  onClose,
  editingGameId,
  formData,
  setFormData,
  onAiGenerate,
  isGeneratingAI,
  lessons,
  onFileUpload,
  isUploading,
  onSubmit,
  isSubmitting
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{editingGameId ? "Edit Game" : "Game Builder"}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onAiGenerate}
              disabled={isGeneratingAI}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
            >
              {isGeneratingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Generate
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">×</button>
          </div>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Game Title</label>
              <input
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Lobby Greeting Matching"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Game Type</label>
                <select
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  value={formData.game_type}
                  onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
                >
                  <option value="SCENE_MATCHER">Scene Matcher</option>
                  <option value="FLASHCARD">Flashcards</option>
                  <option value="WORD_SCRAMBLE">Word Scramble</option>
                  <option value="DIALOGUE_SIM">Dialogue Simulation</option>
                  <option value="HANGMAN">Hangman</option>
                  <option value="TRUE_FALSE">True/False</option>
                  <option value="WORD_ASSOCIATION">Word Association</option>
                  <option value="CATEGORIZATION">Categorization</option>
                  <option value="SYNONYM_ANTONYM">Synonym/Antonym</option>
                  <option value="EMOJI_TO_WORD">Emoji to Word</option>
                  <option value="WORD_CHAIN">Word Chain</option>
                  <option value="PICTURE_DESCRIPTION">Picture Description</option>
                  <option value="ERROR_CORRECTION">Error Correction</option>
                  <option value="RAPID_FIRE">Rapid Fire</option>
                  <option value="IDIOM_GUESSING">Idiom Guessing</option>
                  <option value="RHYME_GAME">Rhyme Game</option>
                  <option value="VOCABULARY_RPG">Vocab RPG</option>
                  <option value="DEBATE_MODE">Debate Mode</option>
                  <option value="SHADOW_READING">Shadow Reading</option>
                  <option value="WORD_SNAP">Word Snap</option>
                  <option value="TONGUE_TWISTER">Tongue Twister</option>
                  <option value="NEWS_HEADLINE">News Headline</option>
                  <option value="SONG_LYRICS">Song Lyrics</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Difficulty</label>
                <select
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Lesson Context</label>
                <select
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  value={formData.lesson_id}
                  onChange={(e) => setFormData({ ...formData, lesson_id: e.target.value })}
                >
                  <option value="">No specific lesson</option>
                  {lessons.map((l: any) => (
                    <option key={l._id?.$oid || l._id} value={l._id?.$oid || l._id}>{l.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">XP Reward</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                  value={formData.xp_reward}
                  onChange={(e) => setFormData({ ...formData, xp_reward: e.target.value })}
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Instructions</label>
              <textarea
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm min-h-[80px]"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="How to play this game..."
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Asset Upload (Optional Image/Audio)</label>
              <div className="flex gap-4 items-center">
                <input
                  type="file"
                  onChange={onFileUpload}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {isUploading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                {formData.asset_url && <span className="text-[10px] text-green-600 font-bold truncate max-w-[200px]">{formData.asset_url}</span>}
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Game Content (JSON)</label>
                <button 
                  type="button"
                  onClick={() => {
                    const template = formData.game_type === 'SCENE_MATCHER' 
                      ? { pairs: [{ text: 'Staff Name', match: 'Location' }] }
                      : { questions: [{ text: 'Question?', correct: 'Answer' }] };
                    setFormData({ ...formData, data_json: JSON.stringify(template, null, 2) });
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Load Template
                </button>
              </div>
              <textarea
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-mono min-h-[250px] bg-slate-900 text-blue-400"
                value={formData.data_json}
                onChange={(e) => setFormData({ ...formData, data_json: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {editingGameId ? "Update Game" : "Save Game"}
          </button>
        </div>
      </div>
    </div>
  )
}
