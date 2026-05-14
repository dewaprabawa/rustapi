import React from 'react'
import { cn } from '../../lib/utils'

interface GamificationHeaderProps {
  activeTab: 'config' | 'games'
  setActiveTab: (tab: 'config' | 'games') => void
}

export const GamificationHeader: React.FC<GamificationHeaderProps> = ({
  activeTab,
  setActiveTab
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gamification</h2>
        <p className="text-slate-500 text-sm mt-1">Configure XP rewards, levels, and mini-games.</p>
      </div>
      <div className="flex bg-slate-100/50 p-1 rounded-xl">
        {(["config", "games"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all duration-200",
              activeTab === tab
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab === "config" ? "XP & Levels" : "Mini-Games"}
          </button>
        ))}
      </div>
    </div>
  )
}
