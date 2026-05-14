import React, { useState, useEffect } from 'react'
import { X, Zap, Check, RotateCcw, Play, Loader2, ArrowRight, Mic, Volume2, Star } from 'lucide-react'
import { cn } from '../../lib/utils'

interface GameSimulationProps {
  game: any
  onClose: () => void
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

export const GameSimulation: React.FC<GameSimulationProps> = ({ game, onClose }) => {
  const [simPhase, setSimPhase] = useState<'play' | 'correct' | 'wrong' | 'done'>('play')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [qIndex, setQIndex] = useState(0)
  const [timer, setTimer] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  
  // Game-specific states
  const [guessedLetters, setGuessedLetters] = useState<string[]>([])
  const [incorrectGuesses, setIncorrectGuesses] = useState(0)
  const [chainInput, setChainInput] = useState("")
  const [rpgHealth, setRpgHealth] = useState({ player: 100, monster: 100 })

  const data = game.data_json || {}
  const questions = data.questions || [data]

  useEffect(() => {
    let interval: any
    if (simPhase === 'play') {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [simPhase])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const checkAnswer = (selected: string, correct: string) => {
    if (selected.toLowerCase() === correct.toLowerCase()) {
      setScore(s => s + 100)
      setStreak(s => s + 1)
      setXpEarned(game.xp_reward || 20)
      setSimPhase('correct')
    } else {
      setStreak(0)
      setSimPhase('wrong')
    }
  }

  const reset = () => {
    setSimPhase('play')
    setQIndex(prev => (prev + 1) % (questions.length || 1))
    setGuessedLetters([])
    setIncorrectGuesses(0)
    setChainInput("")
    setRpgHealth({ player: 100, monster: 100 })
  }

  const renderGame = () => {
    const data = questions[qIndex % (questions.length || 1)] || {}
    
    switch (game.game_type) {
      case "SCENE_MATCHER": {
        const pairs = data.pairs || [{ text: "Waiter", match: "Lobby" }, { text: "Chef", match: "Kitchen" }]
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-400">Match the staff to their location:</p>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{pairs[0].text}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {pairs.map((p: any) => (
                <button
                  key={p.match}
                  onClick={() => checkAnswer(p.match, pairs[0].match)}
                  className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-2xl text-center font-bold hover:bg-white/10 hover:border-blue-500/40 transition-all"
                >
                  {p.match}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "WORD_SCRAMBLE": {
        const word = (data.word || "LOBBY").toUpperCase()
        const scrambled = word.split('').sort(() => Math.random() - 0.5).join('')
        return (
          <div className="space-y-6 text-center">
            <div className="text-sm text-slate-400">Unscramble the word:</div>
            <div className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 my-4">{scrambled}</div>
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-center"
                placeholder="TYPE HERE..."
                onChange={(e) => {
                  if (e.target.value.toUpperCase() === word) {
                    setScore(s => s + 100)
                    setSimPhase('correct')
                    setXpEarned(game.xp_reward || 20)
                  }
                }}
              />
            </div>
          </div>
        )
      }

      case "FLASHCARD": {
        return (
          <div className="perspective-1000 h-64 cursor-pointer group">
             <div className="relative w-full h-full transition-transform duration-500 transform-style-3d group-hover:rotate-y-180">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl flex flex-col items-center justify-center p-8 backface-hidden shadow-xl border border-white/20">
                  <span className="text-[10px] font-black uppercase text-indigo-200 mb-2 tracking-[0.2em]">English</span>
                  <h3 className="text-3xl font-black text-white">{data.front || "Concierge"}</h3>
                </div>
                <div className="absolute inset-0 bg-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 rotate-y-180 backface-hidden shadow-xl border border-white/10">
                  <span className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">Indonesian</span>
                  <h3 className="text-3xl font-black text-blue-400">{data.back || "Resepsionis"}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSimPhase('correct'); setXpEarned(game.xp_reward || 20); }}
                    className="mt-6 px-6 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/40 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                  >
                    I Know This
                  </button>
                </div>
             </div>
          </div>
        )
      }

      case "HANGMAN": {
        const word = (data.word || "HOSPITALITY").toUpperCase()
        const hint = data.hint || "Industry name"
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
        const displayWord = word.split("").map((l: string) => guessedLetters.includes(l) ? l : "_")
        const isWin = !displayWord.includes("_")
        const isLoss = incorrectGuesses >= 6

        return (
          <div className="space-y-6 text-center">
            <p className="text-slate-400 text-sm italic">Hint: {hint}</p>
            <div className="text-4xl font-black tracking-[0.5em] text-white my-8">{displayWord.join("")}</div>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto">
              {letters.map((l: string) => (
                <button
                  key={l}
                  disabled={guessedLetters.includes(l) || isWin || isLoss}
                  onClick={() => {
                    setGuessedLetters(prev => [...prev, l])
                    if (!word.includes(l)) setIncorrectGuesses(g => g + 1)
                  }}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                    guessedLetters.includes(l)
                      ? word.includes(l) ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"
                      : "bg-white/5 hover:bg-white/10 text-slate-400"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="text-rose-400 text-xs font-bold">Lives left: {6 - incorrectGuesses}</div>
            {(isWin || isLoss) && (
              <div className="animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
                <button 
                  onClick={() => {
                    if (isWin) { setScore(s => s + 50); setSimPhase('correct'); }
                    else setSimPhase('wrong');
                  }}
                  className="px-6 py-2 bg-blue-600 rounded-xl font-bold"
                >
                  See Result
                </button>
              </div>
            )}
          </div>
        )
      }

      case "TRUE_FALSE": {
        const statements = data.statements || [{ text: "A concierge is a chef.", correct: false }]
        const current = statements[qIndex % statements.length]
        return (
          <div className="space-y-8 text-center py-10">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <p className="text-xl font-bold text-white leading-relaxed">{current.text}</p>
            </div>
            <div className="flex justify-center gap-6">
              <button 
                onClick={() => checkAnswer("false", current.correct ? "true" : "false")}
                className="group flex flex-col items-center gap-2"
              >
                <div className="h-20 w-20 rounded-full bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-center group-hover:bg-rose-500/20 group-hover:border-rose-500/40 transition-all">
                  <X className="h-10 w-10 text-rose-500" />
                </div>
                <span className="text-sm font-bold text-rose-400">FALSE</span>
              </button>
              <button 
                onClick={() => checkAnswer("true", current.correct ? "true" : "false")}
                className="group flex flex-col items-center gap-2"
              >
                <div className="h-20 w-20 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 group-hover:border-green-500/40 transition-all">
                  <Check className="h-10 w-10 text-green-500" />
                </div>
                <span className="text-sm font-bold text-green-400">TRUE</span>
              </button>
            </div>
          </div>
        )
      }

      case "WORD_ASSOCIATION": {
        const base = data.base_word || "HOTEL"
        const associations = data.associations || ["Room", "Lobby", "Service"]
        return (
          <div className="space-y-6 text-center">
            <div className="text-sm text-slate-400">What relates to:</div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">{base}</div>
            <div className="flex flex-wrap justify-center gap-2">
              {associations.map((word: string) => (
                <button
                  key={word}
                  onClick={() => { setScore(s => s + 10); setSimPhase('correct'); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-sm font-medium"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "CATEGORIZATION": {
        const cats = data.categories || ["Staff", "Tools"]
        const items = data.items || [{ text: "Waiter", category: "Staff" }, { text: "Tray", category: "Tools" }]
        const currentItem = items[qIndex % items.length]
        return (
          <div className="space-y-8 text-center">
            <div className="animate-bounce inline-block px-6 py-3 bg-white/10 border border-white/20 rounded-2xl text-xl font-bold text-white shadow-xl">
              {currentItem.text}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {cats.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => {
                    if (cat === currentItem.category) { setScore(s => s + 20); setSimPhase('correct'); }
                    else setSimPhase('wrong');
                  }}
                  className="h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 hover:border-blue-500/40 transition-all"
                >
                  <div className="h-10 w-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                    <Star className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-300">{cat}</span>
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "SYNONYM_ANTONYM": {
        const word = data.word || "Large"
        const type = data.type || "synonym"
        const opts = data.options || ["Big", "Small"]
        const correct = data.correct || "Big"
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-400">Find the {type} for:</p>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">{word}</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {opts.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, correct)}
                  className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-2xl text-left font-bold hover:bg-white/10 hover:border-violet-500/40 transition-all flex justify-between items-center"
                >
                  <span>{opt}</span>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "DIALOGUE_SIM": {
        const char = data.character || "Guest"
        const scene = data.scenario || "Checking in at the front desk"
        const lines = data.lines || [{ speaker: "Guest", text: "I have a reservation under Smith." }]
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl">
              <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold">🤖</div>
              <div>
                <p className="text-[10px] font-black uppercase text-blue-400">AI Character</p>
                <p className="font-bold text-white">{char}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 italic">Scene: {scene}</p>
            <div className="space-y-4">
              {lines.map((l: any, i: number) => (
                <div key={i} className="bg-white/10 p-4 rounded-2xl rounded-tl-none border-l-4 border-blue-500">
                  <p className="text-[10px] font-bold text-blue-300 mb-1">{l.speaker}</p>
                  <p className="text-sm text-white">{l.text}</p>
                </div>
              ))}
              <div className="animate-pulse flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI is typing...
              </div>
            </div>
            <button onClick={() => setSimPhase('done')} className="w-full py-3 bg-blue-600 rounded-xl font-bold">
              Practice Response
            </button>
          </div>
        )
      }

      case "EMOJI_TO_WORD": {
        const emojis = data.emojis || "🛌🏨"
        const answer = data.answer || "Hotel Room"
        return (
          <div className="space-y-8 text-center py-6">
            <div className="text-7xl mb-8 animate-in zoom-in duration-500 drop-shadow-2xl">{emojis}</div>
            <div className="grid grid-cols-2 gap-3">
              {[answer, "Lobby Bar", "Swimming Pool", "Elevator"].sort().map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, answer)}
                  className="py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "WORD_CHAIN": {
        const start = data.start_word || "Apple"
        return (
          <div className="space-y-6 text-center">
            <p className="text-sm text-slate-400">Start with the last letter of:</p>
            <h2 className="text-4xl font-black text-white">{start}</h2>
            <div className="text-xs text-blue-400 font-black tracking-widest uppercase">Last letter: {start.slice(-1).toUpperCase()}</div>
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
                placeholder={`Type a word starting with ${start.slice(-1)}...`}
                value={chainInput}
                onChange={e => setChainInput(e.target.value)}
              />
              <button 
                onClick={() => {
                  if (chainInput.toLowerCase().startsWith(start.slice(-1).toLowerCase())) setSimPhase('correct');
                  else setSimPhase('wrong');
                }}
                className="px-6 bg-blue-600 rounded-xl font-bold"
              >
                GO
              </button>
            </div>
          </div>
        )
      }

      case "PICTURE_DESCRIPTION": {
        const desc = data.image_description || "A luxury hotel lobby with a large chandelier"
        const keywords = data.keywords || ["chandelier", "lobby", "luxury"]
        return (
          <div className="space-y-6">
            <div className="h-48 bg-slate-700 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-slate-600">
              <span className="text-4xl mb-2">🖼️</span>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">[ IMAGE PREVIEW ]</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] text-center mt-2">{desc}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl">
              <p className="text-xs text-slate-400 mb-2">Target Keywords:</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw: string) => (
                  <span key={kw} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold uppercase">{kw}</span>
                ))}
              </div>
            </div>
            <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm" placeholder="Describe what you see in English..." rows={3} />
            <button onClick={() => setSimPhase('correct')} className="w-full py-3 bg-blue-600 rounded-xl font-bold">Submit Description</button>
          </div>
        )
      }

      case "ERROR_CORRECTION": {
        const inc = data.incorrect || "He don't like coffee."
        const cor = data.correct || "He doesn't like coffee."
        return (
          <div className="space-y-6">
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              <p className="text-xs font-black text-rose-500 uppercase mb-2">Find the error:</p>
              <p className="text-lg font-bold text-white line-through opacity-60 italic">"{inc}"</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[cor, "He doesn't likes coffee.", "He not like coffee."].map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, cor)}
                  className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-2xl text-left font-bold hover:bg-white/10 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "RAPID_FIRE": {
        return (
          <div className="space-y-8 text-center py-10">
            <div className="text-sm font-black text-rose-500 uppercase tracking-[0.3em] animate-pulse">Get Ready!</div>
            <div className="text-5xl font-black text-white scale-110 transition-transform">{["ROOM", "LOBBY", "STAFF", "GUEST"][qIndex % 4]}</div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setSimPhase('correct')} className="py-4 bg-white/5 border-2 border-white/10 rounded-2xl font-bold hover:bg-white/10 hover:border-blue-500/40">Kamar</button>
              <button onClick={() => setSimPhase('wrong')} className="py-4 bg-white/5 border-2 border-white/10 rounded-2xl font-bold hover:bg-white/10 hover:border-blue-500/40">Dapur</button>
            </div>
          </div>
        )
      }

      case "IDIOM_GUESSING": {
        const idiom = data.idiom || "Piece of cake"
        const answer = data.answer || "Very easy"
        return (
          <div className="space-y-6 text-center">
            <div className="h-40 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl flex items-center justify-center text-7xl">🍰</div>
            <h2 className="text-3xl font-black text-white">"{idiom}"</h2>
            <div className="grid grid-cols-1 gap-2">
              {[answer, "A slice of dessert", "A cooking challenge"].map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, answer)}
                  className="py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "RHYME_GAME": {
        const word = data.word || "Stay"
        const answer = data.answer || "Day"
        return (
          <div className="space-y-6 text-center">
            <p className="text-sm text-slate-400">What rhymes with:</p>
            <h2 className="text-4xl font-black text-white uppercase">{word}</h2>
            <div className="grid grid-cols-2 gap-4">
              {[answer, "Sky", "Go", "Be"].map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, answer)}
                  className="py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xl hover:bg-white/10 hover:border-violet-500/40 transition-all"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "VOCABULARY_RPG": {
        const quest = data.quest || "Defeat the Dragon of Disinterest"
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-black uppercase text-blue-400"><span>Hero</span><span>{rpgHealth.player}%</span></div>
                <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${rpgHealth.player}%` }} />
                </div>
                <div className="text-4xl">🛡️</div>
              </div>
              <div className="text-xs font-black text-slate-600">VS</div>
              <div className="space-y-1 text-right">
                <div className="flex justify-between text-[8px] font-black uppercase text-rose-400"><span>{rpgHealth.monster}%</span><span>Monster</span></div>
                <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 transition-all" style={{ width: `${rpgHealth.monster}%` }} />
                </div>
                <div className="text-4xl">🐉</div>
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-slate-400 mb-2">{quest}</p>
              <p className="font-bold text-white">"What is the plural of 'Child'?"</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setRpgHealth(h => ({ ...h, monster: h.monster - 25 })); if (rpgHealth.monster <= 25) setSimPhase('correct'); }} className="py-2 bg-blue-600 rounded-xl text-xs font-bold">Children</button>
              <button onClick={() => { setRpgHealth(h => ({ ...h, player: h.player - 25 })); if (rpgHealth.player <= 25) setSimPhase('wrong'); }} className="py-2 bg-rose-600 rounded-xl text-xs font-bold">Childs</button>
            </div>
          </div>
        )
      }

      case "DEBATE_MODE": {
        const topic = data.topic || "Should hotels charge for Wi-Fi?"
        const side = data.side || "Against"
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 rounded-3xl shadow-xl">
              <p className="text-[10px] font-black uppercase text-violet-200 mb-2 tracking-widest">Debate Topic</p>
              <h3 className="text-lg font-bold text-white leading-tight">{topic}</h3>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl">
              <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase", side === "Against" ? "bg-rose-500/20 text-rose-400" : "bg-green-500/20 text-green-400")}>
                Your Side: {side}
              </div>
            </div>
            <p className="text-xs text-slate-400 italic">Record your argument using professional hospitality English. AI will score your range and fluency.</p>
            <div className="flex justify-center py-4">
              <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Volume2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <button onClick={() => setSimPhase('done')} className="w-full py-4 bg-white/10 hover:bg-white/15 rounded-2xl font-bold transition-all">Submit Argument</button>
          </div>
        )
      }

      case "SHADOW_READING": {
        return (
          <div className="space-y-8">
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1 bg-blue-500" style={{ width: '40%' }} />
              <p className="text-2xl font-black text-white/40 leading-relaxed">
                <span className="text-blue-400">Welcome to the</span> Grand Hotel...
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 bg-rose-600 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-rose-600/30">
                <div className="h-6 w-6 bg-white rounded-full" />
              </div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Recording Now</p>
            </div>
            <button onClick={() => setSimPhase('correct')} className="w-full py-3 bg-white/10 rounded-xl font-bold">Stop & Review</button>
          </div>
        )
      }

      case "WORD_SNAP": {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-40 bg-white/5 border-2 border-white/10 rounded-3xl flex items-center justify-center text-4xl shadow-inner">🛌</div>
              <div className="h-40 bg-white/5 border-2 border-white/10 rounded-3xl flex items-center justify-center text-2xl font-black text-blue-400 shadow-inner">BED</div>
            </div>
            <div className="text-center py-4">
              <button 
                onClick={() => { setSimPhase('correct'); }}
                className="h-24 w-24 bg-blue-600 rounded-full font-black text-2xl shadow-xl shadow-blue-600/40 active:scale-95 transition-transform"
              >
                SNAP!
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">Tap when word matches image!</p>
          </div>
        )
      }

      case "TONGUE_TWISTER": {
        const twister = data.text || "Six slippery snails slid slowly seaward."
        return (
          <div className="space-y-6 text-center">
            <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 rounded-full text-[8px] font-black uppercase">Level: Hard</div>
              <p className="text-2xl font-black text-white italic">"{twister}"</p>
            </div>
            <div className="flex justify-center gap-4 py-4">
              <div className="h-14 w-14 bg-white/10 rounded-full flex items-center justify-center text-slate-400"><RotateCcw className="h-6 w-6" /></div>
              <div className="h-14 w-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"><Play className="h-6 w-6" /></div>
              <div className="h-14 w-14 bg-white/10 rounded-full flex items-center justify-center text-slate-400"><X className="h-6 w-6" /></div>
            </div>
            <button onClick={() => setSimPhase('correct')} className="w-full py-4 bg-violet-600 rounded-2xl font-bold shadow-lg shadow-violet-600/20">Check Pronunciation</button>
          </div>
        )
      }

      case "NEWS_HEADLINE": {
        const headline = data.headline || "Hospitality sector ____ as international travel surges."
        const answer = data.answer || "rebounds"
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-2 mb-4 border-b pb-2 border-slate-100">
                <div className="h-6 w-6 bg-slate-900 rounded flex items-center justify-center text-[10px] font-bold text-white italic">T</div>
                <span className="text-[10px] font-black text-slate-900 tracking-tight">The Hospitality Times</span>
              </div>
              <p className="text-lg font-black text-slate-900 leading-tight">"{headline}"</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[answer, "falls", "closes", "waits"].map(opt => (
                <button
                  key={opt}
                  onClick={() => checkAnswer(opt, answer)}
                  className="py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case "SONG_LYRICS": {
        const lyrics = data.lyrics || "I'm checking in, checking out, and ____ the service."
        const answer = data.answer || "loving"
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-black p-6 rounded-3xl border border-white/10 relative">
              <div className="absolute top-4 right-4 animate-spin">🎵</div>
              <p className="text-sm text-slate-400 mb-1 font-mono">0:45 / 3:20</p>
              <p className="text-lg font-medium text-white italic leading-relaxed">"{lyrics}"</p>
            </div>
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
                placeholder="Missing word..."
                value={chainInput}
                onChange={e => { 
                  setChainInput(e.target.value);
                  if (e.target.value.toLowerCase() === answer.toLowerCase()) {
                    setScore(s => s + 100)
                    setSimPhase('correct')
                  }
                }}
              />
              <button className="px-6 bg-teal-600 rounded-xl font-bold">PLAY</button>
            </div>
          </div>
        )
      }

      default:
        return <p className="text-slate-400 text-center text-sm">No simulator available for this game type.<br/>Data: <code className="text-xs">{JSON.stringify(data).slice(0, 200)}</code></p>
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white">
        {/* Header HUD */}
        <div className="p-6 pb-3 flex justify-between items-start">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1 flex items-center gap-2">
              📱 Live Preview {timer > 0 && <span className="text-slate-400 font-mono font-medium">{formatTime(timer)}</span>}
            </p>
            <h3 className="text-lg font-bold truncate max-w-[280px]">{game.title || "Untitled Game"}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">{gameTypeLabel[game.game_type] || game.game_type}</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" />
                Score: {score}
              </span>
              {streak > 1 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    🔥 {streak} Streak
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Multi-question progress bar */}
        {questions.length > 1 && simPhase === 'play' && (
          <div className="px-6 mb-4">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${((qIndex) / questions.length) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 text-right mt-1 font-medium">
              Question {qIndex + 1} of {questions.length}
            </p>
          </div>
        )}

        {/* Instructions */}
        {game.instructions && simPhase === 'play' && (
          <div className="px-6 pb-3">
            <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">{game.instructions}</p>
          </div>
        )}

        {/* Game area */}
        <div className="px-6 pb-6">
          {(simPhase === 'correct' || simPhase === 'wrong') ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in duration-300">
              <div className={cn(
                "h-20 w-20 rounded-full mx-auto flex items-center justify-center",
                simPhase === 'correct' ? "bg-green-500/20 border-2 border-green-500/40" : "bg-rose-500/20 border-2 border-rose-500/40"
              )}>
                {simPhase === 'correct'
                  ? <Check className="h-10 w-10 text-green-400" />
                  : <X className="h-10 w-10 text-rose-400" />
                }
              </div>
              <p className={cn("text-xl font-black", simPhase === 'correct' ? "text-green-400" : "text-rose-400")}>
                {simPhase === 'correct' ? "Correct! 🎉" : "Not quite! 😅"}
              </p>
              {xpEarned > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/15 border border-amber-500/25 rounded-xl">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-300 font-bold text-sm">+{xpEarned} XP</span>
                </div>
              )}
              <button
                onClick={reset}
                className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-white/10 mt-2"
              >
                <RotateCcw className="h-4 w-4" /> Play Again
              </button>
            </div>
          ) : (
            renderGame()
          )}
        </div>
      </div>
    </div>
  )
}
