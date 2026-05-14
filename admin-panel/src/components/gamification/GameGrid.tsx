import React from 'react'
import { Gamepad2, Play, Pencil, Trash2, Zap } from 'lucide-react'
import { cn, getId } from '../../lib/utils'

interface GameGridProps {
  games: any[]
  onSimulate: (game: any) => void
  onEdit: (game: any) => void
  onDelete: (id: string) => void
}

const gameTypeLabel: Record<string, string> = {
  SCENE_MATCHER: "🖼️ Scene Matcher",
  FLASHCARD: "🎴 Digital Flashcards",
  WORD_SCRAMBLE: "🔤 Word Scramble",
  DIALOGUE_SIM: "💬 Dialogue Simulation",
  HANGMAN: "😵 Hangman",
  TRUE_FALSE: "⚖️ True/False",
  WORD_ASSOCIATION: "🧠 Word Association",
  CATEGORIZATION: "🗄️ Categorization",
  SYNONYM_ANTONYM: "🌓 Synonyms/Antonyms",
  EMOJI_TO_WORD: "😀 Emoji-to-Word",
  WORD_CHAIN: "🔗 Word Chain",
  PICTURE_DESCRIPTION: "📸 Picture Description",
  ERROR_CORRECTION: "❌ Error Correction",
  RAPID_FIRE: "⚡ Rapid Fire",
  IDIOM_GUESSING: "🍰 Idiom Guessing",
  RHYME_GAME: "🎶 Rhyme Game",
  VOCABULARY_RPG: "⚔️ Vocab RPG",
  DEBATE_MODE: "🗣️ Debate Mode",
  SHADOW_READING: "📖 Shadow Reading",
  WORD_SNAP: "🫰 Word Snap",
  TONGUE_TWISTER: "😛 Tongue Twister",
  NEWS_HEADLINE: "📰 News Headline",
  SONG_LYRICS: "🎵 Song Lyrics"
}

export const GameGrid: React.FC<GameGridProps> = ({
  games,
  onSimulate,
  onEdit,
  onDelete
}) => {
  if (games.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <Gamepad2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500">No mini-games configured yet</p>
        <p className="text-xs text-slate-400 mt-1">Create games like Word Scramble, Flashcards, or Matching.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {games.map((game: any) => {
        const gid = getId(game)
        return (
          <div key={gid} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all group relative">
            <div className="flex items-start justify-between mb-3">
              <div className="h-11 w-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Gamepad2 className="h-5 w-5" />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onSimulate(game)}
                  className="p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                  title="Simulate game"
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onEdit(game)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Delete this game?")) {
                      onDelete(gid)
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <h4 className="font-semibold text-slate-800">{game.title || game.name || "Untitled"}</h4>
            <p className="text-xs text-slate-400 font-medium mb-1">{gameTypeLabel[game.game_type] || game.game_type}</p>
            <p className="text-xs text-slate-500 line-clamp-2">{game.instructions || "No instructions"}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                game.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              )}>
                {game.is_active !== false ? "Active" : "Inactive"}
              </span>
              {game.xp_reward && (
                <span className="inline-flex items-center text-xs text-amber-600">
                  <Zap className="h-3 w-3 mr-0.5" /> {game.xp_reward} XP
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
