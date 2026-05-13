import React from 'react'
import { Loader2, MessageSquare, Sparkles, BookOpen } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ConversationRequest {
  _id: any
  status: string
  user_id: string
  context_note: string
  target_words: any[]
}

interface VocabRequestsProps {
  conversationRequests: ConversationRequest[]
  isLoading: boolean
  onGenerateScenario: (id: string) => void
  isGenerating: boolean
}

export const VocabRequests: React.FC<VocabRequestsProps> = ({
  conversationRequests,
  isLoading,
  onGenerateScenario,
  isGenerating
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700">Student Practice Requests</h3>
        <span className="px-2.5 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
          {conversationRequests.length} Total
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading requests...</p>
          </div>
        ) : conversationRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 px-8 text-center">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <p className="text-sm">No student practice requests found.</p>
          </div>
        ) : (
          conversationRequests.map((req) => {
            const reqId = req._id?.$oid || req._id;
            return (
              <div key={reqId} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        req.status === 'pending' ? "bg-amber-100 text-amber-700" :
                        req.status === 'generated' ? "bg-emerald-100 text-emerald-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {req.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">User: {req.user_id.substring(0,8)}...</span>
                    </div>
                    <p className="text-slate-800 font-medium italic">"{req.context_note}"</p>
                  </div>
                  {req.status === 'pending' && (
                    <button 
                      onClick={() => onGenerateScenario(reqId)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate Practice
                    </button>
                  )}
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" /> Target Vocabulary ({req.target_words.length} words)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {req.target_words.map((tw: any, idx: number) => {
                      const twId = tw._id?.$oid || tw._id || String(idx);
                      return (
                        <div key={twId} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm flex gap-2 items-center shadow-sm">
                          <span className="font-bold text-slate-700">{tw.word}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-blue-600 font-medium text-xs">{tw.translation}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  )
}
