import { X } from "lucide-react"
import { cn, normalizeDate } from "../../lib/utils"

interface DetailModalProps {
  isDetailModalOpen: boolean
  detailItem: any
  activeTab: 'courses' | 'modules' | 'lessons'
  closeDetailModal: () => void
}

export default function DetailModal({
  isDetailModalOpen,
  detailItem,
  activeTab,
  closeDetailModal
}: DetailModalProps) {
  if (!isDetailModalOpen || !detailItem) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800 capitalize">
            {activeTab.slice(0, -1)} Details
          </h3>
          <button onClick={closeDetailModal} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ID</span>
              <span className="text-sm font-mono text-slate-700">{detailItem._id?.$oid || detailItem.id}</span>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Title</span>
              <span className="text-base font-medium text-slate-900">{detailItem.title}</span>
            </div>

            {(activeTab === 'courses' || activeTab === 'modules') && (
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {detailItem.description || 'No description provided.'}
                </p>
              </div>
            )}

            {activeTab === 'lessons' && (
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Content</span>
                <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono max-h-60 overflow-y-auto">
                  {detailItem.content || 'No content provided.'}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2">
              {(activeTab === 'courses' || activeTab === 'lessons') && (
                <>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                      {detailItem.category}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Level</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
                      {detailItem.level}
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'modules' && (
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Course ID</span>
                  <span className="text-sm text-slate-700 font-mono">{detailItem.course_id?.$oid || detailItem.course_id}</span>
                </div>
              )}

              {activeTab === 'lessons' && (
                <>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Module ID</span>
                    <span className="text-sm text-slate-700 font-mono">{detailItem.module_id?.$oid || detailItem.module_id}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">XP Reward</span>
                    <span className="text-sm font-medium text-amber-600">{detailItem.xp_reward || 0} XP</span>
                  </div>
                </>
              )}

              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</span>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  detailItem.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                )}>
                  {detailItem.is_published ? 'Published' : 'Draft'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Created At</span>
                <span className="text-sm text-slate-700">
                  {detailItem.created_at ? normalizeDate(detailItem.created_at).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50 flex-shrink-0">
          <button
            onClick={closeDetailModal}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
