import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Mic, Search, ChevronDown, CheckCircle, AlertCircle, Clock, Star, Users } from "lucide-react"
import { getSpeakingSessions } from "../services/api"
import { cn } from "../lib/utils"
import { format } from "date-fns"

export default function SpeakingMonitor() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['speaking-sessions'],
    queryFn: getSpeakingSessions,
  })

  const [search, setSearch] = useState("")
  const [selectedSession, setSelectedSession] = useState<any>(null)

  const filteredSessions = sessions?.filter((s: any) => 
    s.topic.toLowerCase().includes(search.toLowerCase()) ||
    s.level.toLowerCase().includes(search.toLowerCase())
  ) || []

  // Stats
  const totalSessions = sessions?.length || 0
  const completedSessions = sessions?.filter((s: any) => s.status === 'completed').length || 0
  const avgScore = totalSessions > 0 
    ? Math.round(sessions.reduce((acc: number, s: any) => acc + (s.scores?.overall_score || 0), 0) / completedSessions) 
    : 0
  const lowScores = sessions?.filter((s: any) => s.status === 'completed' && s.scores && s.scores.overall_score < 50).length || 0

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Mic className="h-6 w-6 text-indigo-500" />
            Speaking Monitor
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Analyze learner role-play transcripts and AI Coach evaluations.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Sessions</p>
            <p className="text-2xl font-bold text-slate-800">{totalSessions}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Completed</p>
            <p className="text-2xl font-bold text-slate-800">{completedSessions}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Star className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Avg Score</p>
            <p className="text-2xl font-bold text-slate-800">{avgScore}/100</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Flagged (<span className="text-xs">&lt;50</span>)</p>
            <p className="text-2xl font-bold text-red-600">{lowScores}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">Recent Sessions</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSessions.map((session: any) => {
              const isSelected = selectedSession?._id === session._id;
              const isCompleted = session.status === 'completed';
              const score = session.scores?.overall_score;
              const isLowScore = score && score < 50;

              return (
                <button
                  key={session._id}
                  onClick={() => setSelectedSession(session)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-colors border",
                    isSelected 
                      ? "bg-indigo-50 border-indigo-100" 
                      : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-100"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-slate-800 truncate pr-2">{session.topic}</span>
                    {isLowScore && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5" title="Low Score"></span>}
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="uppercase font-semibold tracking-wider">{session.level}</span>
                    <span>{format(new Date(session.created_at.$date || session.created_at), 'MMM d, HH:mm')}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", 
                      isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {session.status}
                    </span>
                    {score && <span className="text-xs font-bold text-slate-700">{score}/100</span>}
                  </div>
                </button>
              )
            })}
            {filteredSessions.length === 0 && (
              <div className="text-center p-8 text-slate-400 text-sm">No sessions found.</div>
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          {selectedSession ? (
            <>
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{selectedSession.topic}</h3>
                  <p className="text-sm text-slate-500">User ID: <span className="font-mono text-xs">{selectedSession.user_id.$oid || selectedSession.user_id}</span></p>
                </div>
                {selectedSession.scores && (
                  <div className={cn("px-4 py-2 rounded-xl border text-center", 
                    selectedSession.scores.overall_score < 50 ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
                  )}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-0.5">Overall Score</div>
                    <div className="text-xl font-bold leading-none">{selectedSession.scores.overall_score}</div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Transcript</h4>
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-4">
                      {selectedSession.turns.map((turn: any, i: number) => (
                        <div key={i} className={cn("flex gap-3", turn.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                          <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold", 
                            turn.role === 'user' ? "bg-indigo-500" : "bg-emerald-500"
                          )}>
                            {turn.role === 'user' ? 'U' : 'AI'}
                          </div>
                          <div className={cn("p-3 rounded-2xl max-w-[80%] text-sm",
                            turn.role === 'user' ? "bg-indigo-50 text-indigo-900 rounded-tr-sm" : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                          )}>
                            {turn.transcript}
                          </div>
                        </div>
                      ))}
                      {selectedSession.turns.length === 0 && <p className="text-sm text-slate-400">No transcript data available.</p>}
                    </div>
                  </div>

                  {selectedSession.scores && (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Feedback Notes</h4>
                        <div className="bg-amber-50 border border-amber-100 text-amber-900 rounded-xl p-4 text-sm leading-relaxed">
                          {selectedSession.scores.feedback_notes}
                        </div>
                      </div>

                      {selectedSession.scores.grammar_corrections?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Grammar Highlights</h4>
                          <div className="space-y-3">
                            {selectedSession.scores.grammar_corrections.map((c: any, i: number) => (
                              <div key={i} className="bg-white border border-red-100 rounded-xl p-4">
                                <p className="text-sm text-red-600 line-through mb-1">{c.original_text}</p>
                                <p className="text-sm text-emerald-600 font-medium mb-2">{c.corrected_text}</p>
                                <p className="text-xs text-slate-500">{c.explanation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Mic className="h-12 w-12 text-slate-200 mb-4" />
              <p className="text-lg font-medium text-slate-600">Select a session</p>
              <p className="text-sm mt-1">Click on a session from the list to view its transcript and AI evaluation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
