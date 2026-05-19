import React from "react"
import { DrillManager } from "../components/drills/DrillManager"

const VideoDrillManager: React.FC = () => {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">Video Drills</h1>
        <p className="text-slate-500 mt-1">Create and manage video-based vocabulary and sentence drills.</p>
      </div>
      
      <div className="flex-1 bg-white rounded-2xl border shadow-sm overflow-hidden p-6">
        <DrillManager />
      </div>
    </div>
  )
}

export default VideoDrillManager
