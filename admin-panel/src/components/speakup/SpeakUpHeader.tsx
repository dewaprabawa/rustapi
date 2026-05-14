import React from 'react'
import { Waves, Plus } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SpeakUpHeaderProps {
  activeTab: 'shadowing' | 'expansion'
  setActiveTab: (tab: 'shadowing' | 'expansion') => void
  onAddClick: () => void
}

export const SpeakUpHeader: React.FC<SpeakUpHeaderProps> = ({
  activeTab,
  setActiveTab,
  onAddClick
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Waves className="h-6 w-6 text-blue-500" />
            SpeakUp Fluency Content
          </h2>
          <p className="text-slate-500 text-sm mt-1">Design shadowing and expansion drills for rapid fluency gains.</p>
        </div>
        
        <button 
          onClick={onAddClick}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {activeTab === 'shadowing' ? 'Shadowing' : 'Expansion'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("shadowing")}
          className={cn(
            "px-6 py-2 text-sm font-bold rounded-xl transition-all",
            activeTab === "shadowing" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Shadowing
        </button>
        <button
          onClick={() => setActiveTab("expansion")}
          className={cn(
            "px-6 py-2 text-sm font-bold rounded-xl transition-all",
            activeTab === "expansion" ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Sentence Expansion
        </button>
      </div>
    </div>
  )
}
