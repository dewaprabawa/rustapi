import React from 'react'
import { BookOpen, Loader2, ChevronRight, Globe } from 'lucide-react'
import { cn } from '../../lib/utils'

interface VocabSet {
  _id: any
  title: string
  topic: string
  level: string
  language: string
  word_count: number
  status: string
}

interface VocabSetListProps {
  vocabSets: VocabSet[]
  isLoading: boolean
  selectedSet: VocabSet | null
  libraryTab: 'vocabulary' | 'phrasal_verbs'
  setLibraryTab: (tab: 'vocabulary' | 'phrasal_verbs') => void
  onSetClick: (set: VocabSet) => void
}

export const VocabSetList: React.FC<VocabSetListProps> = ({
  vocabSets,
  isLoading,
  selectedSet,
  libraryTab,
  setLibraryTab,
  onSetClick
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Vocabulary Library</h3>
          <span className="px-2.5 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
            {vocabSets.length} Sets
          </span>
        </div>
        
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button
            onClick={() => setLibraryTab('vocabulary')}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
              libraryTab === 'vocabulary' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Standard
          </button>
          <button
            onClick={() => setLibraryTab('phrasal_verbs')}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
              libraryTab === 'phrasal_verbs' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Phrasal & Collocations
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading library...</p>
          </div>
        ) : vocabSets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 px-8 text-center">
            <BookOpen className="h-12 w-12 opacity-20" />
            <p className="text-sm">No vocabulary sets found. Click "Generate New Set" to begin.</p>
          </div>
        ) : (
          vocabSets.map((set) => {
            const id = set._id?.$oid || set._id;
            const selectedId = selectedSet?._id?.$oid || selectedSet?._id;
            return (
              <button
                key={id}
                onClick={() => onSetClick(set)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all duration-200 group",
                  selectedId === id 
                    ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100" 
                    : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-tight",
                    set.level.startsWith('A') ? "bg-emerald-100 text-emerald-700" :
                    set.level.startsWith('B') ? "bg-amber-100 text-amber-700" :
                    "bg-rose-100 text-rose-700"
                  )}>
                    {set.level}
                  </span>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform group-hover:translate-x-0.5",
                    selectedId === id ? "text-blue-500" : "text-slate-300"
                  )} />
                </div>
                <h4 className="font-bold text-slate-800 line-clamp-1">{set.title}</h4>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> {set.topic} • {set.word_count} words
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  )
}
