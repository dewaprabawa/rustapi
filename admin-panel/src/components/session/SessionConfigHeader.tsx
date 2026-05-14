import React from 'react'
import { cn } from '../../lib/utils'

interface SessionConfigHeaderProps {
  tab: 'templates' | 'overrides'
  setTab: (tab: 'templates' | 'overrides') => void
}

export const SessionConfigHeader: React.FC<SessionConfigHeaderProps> = ({ tab, setTab }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Session Architecture</h2>
        <p className="text-slate-500 text-sm mt-1">Configure session phases, lives, and rewards.</p>
      </div>
      <div className="flex bg-slate-100/50 p-1 rounded-xl">
        {(["templates", "overrides"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all duration-200",
              tab === t
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t === "templates" ? "Level Templates" : "Lesson Overrides"}
          </button>
        ))}
      </div>
    </div>
  )
}
