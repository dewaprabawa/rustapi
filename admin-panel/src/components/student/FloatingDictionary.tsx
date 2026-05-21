import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  BookOpen, 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Volume2, 
  Star, 
  Sparkles, 
  Bookmark, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  RefreshCw,
  Info,
  Edit2,
  BookmarkCheck
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getVocabulary } from "../../services/api"
import { cn } from "../../lib/utils"

export interface FavoriteVocab {
  id: string
  word: string
  translation: string
  partOfSpeech?: string
  definition?: string
  example?: string
  notes?: string
  isCustom?: boolean
  dateAdded: string
}

const defaultFavorites: FavoriteVocab[] = [
  {
    id: "demo-1",
    word: "Concierge",
    translation: "Petugas layanan tamu",
    partOfSpeech: "noun",
    definition: "A hotel employee whose job is to assist guests by booking tours, making theatre reservations, etc.",
    example: "Ask the concierge to book a taxi for you.",
    notes: "Pronounced /ˌkɔːn.si.ˈerʒ/",
    dateAdded: new Date().toISOString()
  },
  {
    id: "demo-2",
    word: "Amenities",
    translation: "Fasilitas penunjang",
    partOfSpeech: "noun",
    definition: "Desirable or useful features of a building or place.",
    example: "The room rate includes access to all hotel amenities, including the spa and pool.",
    notes: "E.g. soap, towels, gym access.",
    dateAdded: new Date().toISOString()
  },
  {
    id: "demo-3",
    word: "Complimentary",
    translation: "Gratis / Diberikan cuma-cuma",
    partOfSpeech: "adjective",
    definition: "Given free of charge, often as a courtesy.",
    example: "We received a complimentary bottle of champagne upon arrival.",
    notes: "Different from 'complementary' (matching).",
    dateAdded: new Date().toISOString()
  }
]

export default function FloatingDictionary() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"favorites" | "browse" | "practice">("favorites")
  const [searchQuery, setSearchQuery] = useState("")
  const [partOfSpeechFilter, setPartOfSpeechFilter] = useState<string>("all")
  
  // Draggable Button references
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  
  // Favorites stored in LocalStorage
  const [favorites, setFavorites] = useState<FavoriteVocab[]>(() => {
    const saved = localStorage.getItem("student_vocabulary_favorites")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    return defaultFavorites
  })

  // Sync favorites with local storage
  useEffect(() => {
    localStorage.setItem("student_vocabulary_favorites", JSON.stringify(favorites))
  }, [favorites])

  // Custom vocab state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newWord, setNewWord] = useState("")
  const [newTranslation, setNewTranslation] = useState("")
  const [newPart, setNewPart] = useState("noun")
  const [newDefinition, setNewDefinition] = useState("")
  const [newExample, setNewExample] = useState("")
  const [newNotes, setNewNotes] = useState("")

  // Expanded card state
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null)

  // TTS audio
  const speak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if ("speechSynthesis" in window) {
      // Cancel current speaking
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      window.speechSynthesis.speak(utterance)
    }
  }

  // Fetch all system vocabularies
  const { data: systemVocabData, isLoading: isLoadingSystem } = useQuery({
    queryKey: ["allSystemVocabulary"],
    queryFn: () => getVocabulary(),
    retry: 1,
  })

  // Handle manual addition
  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWord || !newTranslation) return

    const newFavorite: FavoriteVocab = {
      id: "custom-" + Date.now(),
      word: newWord.trim(),
      translation: newTranslation.trim(),
      partOfSpeech: newPart,
      definition: newDefinition.trim(),
      example: newExample.trim(),
      notes: newNotes.trim(),
      isCustom: true,
      dateAdded: new Date().toISOString()
    }

    setFavorites(prev => [newFavorite, ...prev])
    
    // Reset form
    setNewWord("")
    setNewTranslation("")
    setNewPart("noun")
    setNewDefinition("")
    setNewExample("")
    setNewNotes("")
    setShowAddForm(false)
    setActiveTab("favorites")
  }

  // Handle remove
  const handleRemoveWord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavorites(prev => prev.filter(item => item.id !== id))
    if (expandedWordId === id) setExpandedWordId(null)
  }

  // Handle note edit
  const handleUpdateNotes = (id: string, notes: string) => {
    setFavorites(prev => prev.map(item => item.id === id ? { ...item, notes } : item))
  }

  // Star/Bookmark toggle for system vocabularies
  const toggleSystemFavorite = (wordItem: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const exists = favorites.some(fav => fav.word.toLowerCase() === wordItem.word.toLowerCase())
    if (exists) {
      setFavorites(prev => prev.filter(fav => fav.word.toLowerCase() !== wordItem.word.toLowerCase()))
    } else {
      const newFav: FavoriteVocab = {
        id: wordItem._id?.$oid || wordItem.id || "sys-" + Date.now(),
        word: wordItem.word,
        translation: wordItem.translation,
        partOfSpeech: wordItem.part_of_speech || "noun",
        definition: wordItem.definition || wordItem.example_en || "",
        example: wordItem.example_en || "",
        notes: wordItem.notes || wordItem.pronunciation || "",
        isCustom: false,
        dateAdded: new Date().toISOString()
      }
      setFavorites(prev => [newFav, ...prev])
    }
  }

  // Filter favorites
  const filteredFavorites = favorites.filter(fav => {
    const matchesSearch = fav.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          fav.translation.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPart = partOfSpeechFilter === "all" || fav.partOfSpeech === partOfSpeechFilter
    return matchesSearch && matchesPart
  })

  // Filter system vocabs
  const systemVocabs = systemVocabData || []
  const filteredSystemVocabs = systemVocabs.filter((sys: any) => {
    const matchesSearch = sys.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sys.translation.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPart = partOfSpeechFilter === "all" || (sys.part_of_speech || "noun") === partOfSpeechFilter
    return matchesSearch && matchesPart
  })

  // Practice Arena state
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [shuffledPractice, setShuffledPractice] = useState<FavoriteVocab[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [practiceCompleted, setPracticeCompleted] = useState(false)

  const startPractice = () => {
    if (favorites.length === 0) return
    const shuffled = [...favorites].sort(() => Math.random() - 0.5)
    setShuffledPractice(shuffled)
    setPracticeIndex(0)
    setShowAnswer(false)
    setCorrectCount(0)
    setPracticeCompleted(false)
  }

  useEffect(() => {
    if (activeTab === "practice") {
      startPractice()
    }
  }, [activeTab])

  const handlePracticeScore = (remembered: boolean) => {
    if (remembered) {
      setCorrectCount(c => c + 1)
    }
    if (practiceIndex < shuffledPractice.length - 1) {
      setPracticeIndex(idx => idx + 1)
      setShowAnswer(false)
    } else {
      setPracticeCompleted(true)
    }
  }

  return (
    <>
      {/* Floating Draggable Bubble Button */}
      <motion.button
        ref={buttonRef}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        dragConstraints={{
          left: 10,
          right: window.innerWidth - 80,
          top: 10,
          bottom: window.innerHeight - 80
        }}
        onPointerDown={(e) => {
          dragStartRef.current = { x: e.clientX, y: e.clientY }
        }}
        onClick={(e) => {
          const distance = Math.sqrt(
            Math.pow(e.clientX - dragStartRef.current.x, 2) +
            Math.pow(e.clientY - dragStartRef.current.y, 2)
          )
          if (distance < 10) {
            setIsOpen(prev => !prev)
          }
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center cursor-grab active:cursor-grabbing border border-white/20 hover:shadow-2xl transition-all"
        title="Floating Vocabulary Dictionary"
      >
        <BookOpen className="w-6 h-6" />
        {favorites.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border border-white animate-pulse">
            {favorites.length}
          </span>
        )}
      </motion.button>

      {/* Dictionary Drawer Side Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50"
            />

            {/* Side Panel Container */}
            <motion.div
              initial={{ x: "100%", opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] bg-white border-l border-slate-100 shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-50 bg-gradient-to-r from-blue-50/50 to-indigo-50/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg tracking-tight">Vocabulary Notebook</h3>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Floating Inventory</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-100 px-4 bg-slate-50/20">
                <button
                  onClick={() => { setActiveTab("favorites"); setShowAddForm(false); }}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold text-center border-b-2 transition-all flex justify-center items-center gap-1.5",
                    activeTab === "favorites" 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  My Favorites ({favorites.length})
                </button>
                
                <button
                  onClick={() => { setActiveTab("browse"); setShowAddForm(false); }}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold text-center border-b-2 transition-all flex justify-center items-center gap-1.5",
                    activeTab === "browse" 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Search className="w-3.5 h-3.5" />
                  Browse Lessons
                </button>

                <button
                  onClick={() => { setActiveTab("practice"); setShowAddForm(false); }}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold text-center border-b-2 transition-all flex justify-center items-center gap-1.5",
                    activeTab === "practice" 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Flashcards
                </button>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Search & Filter Header (Only for list tabs) */}
                {activeTab !== "practice" && !showAddForm && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder={activeTab === "favorites" ? "Search favorite words..." : "Search system vocabulary..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                    
                    {/* Part of Speech Badges Filters */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {["all", "noun", "verb", "adjective", "adverb", "phrase"].map(part => (
                        <button
                          key={part}
                          onClick={() => setPartOfSpeechFilter(part)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shrink-0 transition-all",
                            partOfSpeechFilter === part 
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                          )}
                        >
                          {part}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 1: FAVORITES */}
                {activeTab === "favorites" && (
                  <>
                    {/* Add Custom Word Form Box */}
                    {showAddForm ? (
                      <motion.form 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleAddWord}
                        className="p-5 border border-blue-100 rounded-3xl bg-blue-50/20 space-y-4"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-blue-500" /> Add Custom Word
                          </h4>
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Word *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Reservation"
                              value={newWord}
                              onChange={(e) => setNewWord(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Part of Speech</label>
                            <select
                              value={newPart}
                              onChange={(e) => setNewPart(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                            >
                              <option value="noun">Noun</option>
                              <option value="verb">Verb</option>
                              <option value="adjective">Adjective</option>
                              <option value="adverb">Adverb</option>
                              <option value="phrase">Phrase</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Translation *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Reservasi / Pemesanan"
                              value={newTranslation}
                              onChange={(e) => setNewTranslation(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Definition (English)</label>
                          <textarea
                            placeholder="Brief English explanation..."
                            value={newDefinition}
                            onChange={(e) => setNewDefinition(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Example Sentence</label>
                          <input
                            type="text"
                            placeholder="We have a table reservation for 8 PM."
                            value={newExample}
                            onChange={(e) => setNewExample(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Personal Memory Notes</label>
                          <input
                            type="text"
                            placeholder="Synonym: booking. Root word: reserve."
                            value={newNotes}
                            onChange={(e) => setNewNotes(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-blue-500/20"
                        >
                          Save New Word
                        </button>
                      </motion.form>
                    ) : (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-xs font-bold text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/10 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Add Custom Vocabulary
                      </button>
                    )}

                    {/* Favorites List */}
                    {!showAddForm && (
                      <div className="space-y-3">
                        {filteredFavorites.length === 0 ? (
                          <div className="text-center p-12 text-slate-400">
                            {searchQuery ? (
                              <p className="font-semibold text-sm">No matching words found.</p>
                            ) : (
                              <div className="space-y-3">
                                <p className="font-bold text-sm text-slate-500">Your vocabulary list is empty.</p>
                                <p className="text-xs text-slate-400">Add words manually, or browse words from your lessons to start building your glossary.</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          filteredFavorites.map((fav) => {
                            const isExpanded = expandedWordId === fav.id
                            return (
                              <div 
                                key={fav.id}
                                className={cn(
                                  "border border-slate-100 rounded-2xl bg-white shadow-xs transition-all hover:shadow-md cursor-pointer overflow-hidden",
                                  isExpanded && "border-blue-200 ring-2 ring-blue-500/5 shadow-md"
                                )}
                                onClick={() => setExpandedWordId(isExpanded ? null : fav.id)}
                              >
                                {/* Word Header */}
                                <div className="p-4 flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-black text-slate-800 text-base tracking-tight">{fav.word}</h4>
                                      {fav.partOfSpeech && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md uppercase tracking-wider scale-90 origin-left">
                                          {fav.partOfSpeech}
                                        </span>
                                      )}
                                      {fav.isCustom && (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-md uppercase tracking-wider scale-90 origin-left">
                                          Custom
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm font-bold text-blue-600 leading-snug">{fav.translation}</p>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={(e) => speak(fav.word, e)}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                      title="Listen Pronunciation"
                                    >
                                      <Volume2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => handleRemoveWord(fav.id, e)}
                                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                  </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="border-t border-slate-50 bg-slate-50/50 p-4 space-y-3.5 text-xs text-slate-600"
                                      onClick={(e) => e.stopPropagation()} // Prevent collapse when editing notes
                                    >
                                      {fav.definition && (
                                        <div className="space-y-1">
                                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Definition</span>
                                          <p className="leading-relaxed text-slate-700 font-medium">{fav.definition}</p>
                                        </div>
                                      )}

                                      {fav.example && (
                                        <div className="space-y-1">
                                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Example Usage</span>
                                          <p className="leading-relaxed italic text-slate-700 font-semibold bg-white p-2.5 rounded-xl border border-slate-100">
                                            "{fav.example}"
                                          </p>
                                        </div>
                                      )}

                                      {/* Custom Notes Section */}
                                      <div className="space-y-1">
                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                          <Edit2 className="w-2.5 h-2.5 text-slate-400" /> My Memory Notes
                                        </span>
                                        <textarea
                                          value={fav.notes || ""}
                                          onChange={(e) => handleUpdateNotes(fav.id, e.target.value)}
                                          placeholder="Add personal notes or mnemonic keys here..."
                                          rows={2}
                                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                        />
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* TAB 2: BROWSE SYSTEM VOCABULARY */}
                {activeTab === "browse" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 bg-blue-50/60 p-4 rounded-2xl border border-blue-100/50">
                      <Info className="w-5 h-5 text-blue-500 shrink-0" />
                      <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                        These vocabulary terms are fetched from the lesson course files. Toggle the star to bookmark them to your personal notebook.
                      </p>
                    </div>

                    {isLoadingSystem ? (
                      <div className="flex flex-col items-center justify-center p-12 space-y-3">
                        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                        <p className="text-slate-400 text-xs font-bold">Fetching system lessons vocabulary...</p>
                      </div>
                    ) : filteredSystemVocabs.length === 0 ? (
                      <div className="text-center p-12 text-slate-400">
                        <p className="font-semibold text-sm">No vocabulary items available.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredSystemVocabs.map((wordItem: any, idx: number) => {
                          const isBookmarked = favorites.some(fav => fav.word.toLowerCase() === wordItem.word.toLowerCase())
                          
                          return (
                            <div
                              key={wordItem._id?.$oid || wordItem.id || idx}
                              className="border border-slate-100 rounded-2xl bg-white p-4 flex items-center justify-between gap-3 shadow-xs hover:border-slate-200 transition-all"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-slate-800 text-sm tracking-tight">{wordItem.word}</h4>
                                  {wordItem.part_of_speech && (
                                    <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-slate-400 text-[8px] font-bold rounded-md uppercase tracking-wider">
                                      {wordItem.part_of_speech}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-blue-600 leading-normal">{wordItem.translation}</p>
                                {wordItem.example_en && (
                                  <p className="text-[11px] text-slate-400 italic font-medium mt-1 line-clamp-1">
                                    "{wordItem.example_en}"
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => speak(wordItem.word, e)}
                                  className="p-2 text-slate-300 hover:text-blue-600 rounded-xl transition-colors"
                                  title="Pronounce Word"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => toggleSystemFavorite(wordItem, e)}
                                  className={cn(
                                    "p-2 rounded-xl transition-colors",
                                    isBookmarked 
                                      ? "text-amber-500 bg-amber-50 hover:bg-amber-100" 
                                      : "text-slate-300 hover:text-amber-500 hover:bg-slate-50"
                                  )}
                                  title={isBookmarked ? "Remove bookmark" : "Bookmark vocabulary"}
                                >
                                  <Star className={cn("w-4 h-4", isBookmarked && "fill-amber-500")} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: FLASHCARD PRACTICE */}
                {activeTab === "practice" && (
                  <div className="space-y-6">
                    {favorites.length < 2 ? (
                      <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-4">
                        <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
                        <div>
                          <p className="font-bold text-sm text-slate-600">Need More Vocabulary</p>
                          <p className="text-xs text-slate-400 max-w-[280px] mx-auto mt-1 leading-relaxed">
                            You need at least 2 favorited vocabulary words to launch the practice arena. Start saving words from lessons!
                          </p>
                        </div>
                      </div>
                    ) : practiceCompleted ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center p-8 bg-gradient-to-tr from-indigo-550 to-blue-500 text-white rounded-[2.5rem] shadow-xl shadow-indigo-500/20 relative overflow-hidden"
                      >
                        {/* Background flare */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-inner">
                          <Sparkles className="w-9 h-9 text-white animate-pulse" />
                        </div>
                        
                        <h4 className="text-2xl font-black mb-2">Practice Done!</h4>
                        <p className="text-blue-100 text-xs font-bold max-w-[250px] mx-auto mb-8">
                          Excellent job! Re-reviewing terms keeps them fresh in your active vocabulary storage.
                        </p>

                        <div className="bg-white/15 backdrop-blur-md p-6 rounded-3xl mb-8 border border-white/10">
                          <span className="block text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Remembered Score</span>
                          <span className="text-3xl font-black text-white">{correctCount} <span className="text-lg font-bold text-blue-200">/ {shuffledPractice.length}</span></span>
                          <span className="block text-[9px] font-bold text-emerald-300 uppercase tracking-widest mt-2">Accuracy: {Math.round((correctCount / shuffledPractice.length) * 100)}%</span>
                        </div>

                        <button
                          onClick={startPractice}
                          className="w-full bg-white text-indigo-700 hover:scale-105 active:scale-95 py-4 rounded-2xl font-black text-sm transition-all shadow-md"
                        >
                          Practice Again
                        </button>
                      </motion.div>
                    ) : (
                      <div className="space-y-6">
                        {/* Practice Status Header */}
                        <div className="flex justify-between items-center text-xs font-black text-slate-400 tracking-wider">
                          <span>CARD {practiceIndex + 1} OF {shuffledPractice.length}</span>
                          <span className="text-blue-600 font-bold">Score: {correctCount}</span>
                        </div>

                        {/* Flashcard Component */}
                        <div className="h-72 w-full relative perspective">
                          <motion.div
                            animate={{ rotateY: showAnswer ? 180 : 0 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="w-full h-full preserve-3d cursor-pointer"
                            onClick={() => setShowAnswer(!showAnswer)}
                          >
                            {/* Card Front */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-8 flex flex-col justify-between shadow-lg border border-slate-700/50 backface-hidden">
                              <div className="flex justify-between items-start">
                                <span className="px-2 py-0.5 bg-white/15 text-indigo-200 text-[8px] font-black rounded uppercase tracking-wider">
                                  {shuffledPractice[practiceIndex]?.partOfSpeech || "Vocabulary"}
                                </span>
                                <button
                                  onClick={(e) => speak(shuffledPractice[practiceIndex]?.word || "", e)}
                                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                  title="Pronounce"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="text-center space-y-2">
                                <h3 className="text-3xl font-black tracking-tight leading-none">
                                  {shuffledPractice[practiceIndex]?.word}
                                </h3>
                                {shuffledPractice[practiceIndex]?.definition && (
                                  <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-[280px] mx-auto line-clamp-3 italic">
                                    "{shuffledPractice[practiceIndex]?.definition}"
                                  </p>
                                )}
                              </div>

                              <div className="text-center text-[10px] text-indigo-300 font-black uppercase tracking-widest">
                                Click card to reveal translation
                              </div>
                            </div>

                            {/* Card Back */}
                            <div className="absolute inset-0 bg-blue-600 text-white rounded-3xl p-8 flex flex-col justify-between shadow-lg border border-blue-500 rotate-y-180 backface-hidden">
                              <div className="flex justify-between items-start">
                                <span className="px-2 py-0.5 bg-white/20 text-blue-100 text-[8px] font-black rounded uppercase tracking-wider">
                                  Translation
                                </span>
                              </div>

                              <div className="text-center space-y-4">
                                <h3 className="text-2xl font-black tracking-tight leading-none">
                                  {shuffledPractice[practiceIndex]?.translation}
                                </h3>
                                
                                {shuffledPractice[practiceIndex]?.example && (
                                  <div className="p-3 bg-white/10 rounded-2xl text-[11px] leading-relaxed max-w-[280px] mx-auto text-left border border-white/5">
                                    <span className="block text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Example</span>
                                    "{shuffledPractice[practiceIndex]?.example}"
                                  </div>
                                )}
                              </div>

                              <div className="text-center text-[10px] text-blue-200 font-black uppercase tracking-widest">
                                Click card to see word again
                              </div>
                            </div>
                          </motion.div>
                        </div>

                        {/* Answer Action Panel */}
                        <div className="space-y-3 pt-4">
                          {!showAnswer ? (
                            <button
                              onClick={() => setShowAnswer(true)}
                              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm transition-all shadow-md"
                            >
                              Reveal Translation
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => handlePracticeScore(false)}
                                className="py-4 border border-rose-100 hover:border-rose-200 hover:bg-rose-50 text-rose-500 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5"
                              >
                                Forgot / Need review
                              </button>
                              <button
                                onClick={() => handlePracticeScore(true)}
                                className="py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-1.5"
                              >
                                Remembered word!
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
