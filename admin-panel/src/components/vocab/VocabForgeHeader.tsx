import React from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../../lib/utils'

interface VocabForgeHeaderProps {
  activeTab: 'library' | 'requests' | 'groups'
  setActiveTab: (tab: 'library' | 'requests' | 'groups') => void
  pendingRequestsCount: number
  onGenerateClick: () => void
  onManualClick: () => void
}

export const VocabForgeHeader: React.FC<VocabForgeHeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingRequestsCount,
  onGenerateClick,
  onManualClick
}) => {
  return (
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">VocabForge AI</h2>
        <p className="text-slate-500 mt-1">Generate and manage high-quality vocabulary sets for hospitality training.</p>
      </div>
      <div className="flex gap-3">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('library')}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              activeTab === 'library' 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Library
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2",
              activeTab === 'requests' 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Student Requests
            {pendingRequestsCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              activeTab === 'groups' 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Groups
          </button>
        </div>
        <button 
          onClick={onManualClick}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="h-5 w-5 text-indigo-500" />
          Add Manually
        </button>
        <button 
          onClick={onGenerateClick}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="h-5 w-5" />
          Generate New Set
        </button>
      </div>
    </div>
  )
}
