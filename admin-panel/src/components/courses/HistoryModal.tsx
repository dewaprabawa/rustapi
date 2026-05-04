import { RotateCcw, X, Loader2 } from "lucide-react"
import { normalizeDate } from "../../lib/utils"

interface HistoryModalProps {
  isHistoryModalOpen: boolean
  setIsHistoryModalOpen: (open: boolean) => void
  versions: any[]
  versionsLoading: boolean
  rollbackMutation: any
}

export default function HistoryModal({
  isHistoryModalOpen,
  setIsHistoryModalOpen,
  versions,
  versionsLoading,
  rollbackMutation
}: HistoryModalProps) {
  if (!isHistoryModalOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Version History</h3>
          <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {versionsLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
          ) : versions?.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">No previous versions found.</div>
          ) : (
            <div className="space-y-3">
              {versions?.map((v: any) => (
                <div key={v.version} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-800">Version {v.version}</div>
                    <div className="text-xs text-slate-500 mt-1">{normalizeDate(v.created_at)?.toLocaleString() || "—"}</div>
                  </div>
                  <button
                    onClick={() => rollbackMutation.mutate(v.version)}
                    disabled={rollbackMutation.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
