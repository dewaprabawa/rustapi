import { X, Volume2 } from "lucide-react"
import { cn, normalizeDate } from "../../lib/utils"
import { useQuery } from "@tanstack/react-query"
import { getVocabulary } from "../../services/api"

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
  const lessonId = detailItem?._id?.$oid || detailItem?.id;

  const { data: vocabData, isLoading: isLoadingVocab } = useQuery({
    queryKey: ['lessonVocab', lessonId],
    queryFn: () => getVocabulary(lessonId),
    enabled: isDetailModalOpen && activeTab === 'lessons' && !!lessonId,
  })

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
                  {detailItem.created_at ? normalizeDate(detailItem.created_at)?.toLocaleDateString() || "—" : "—"}
                </span>
              </div>
            </div>

            {activeTab === 'lessons' && (
              <div className="pt-6 border-t border-slate-100">
                <span className="block text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  Lesson Vocabulary
                  {vocabData?.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                      {vocabData.length} Words
                    </span>
                  )}
                </span>
                
                {isLoadingVocab ? (
                  <div className="text-sm text-slate-400 py-4 text-center">Loading vocabulary...</div>
                ) : !vocabData || vocabData.length === 0 ? (
                  <div className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                    No vocabulary found for this lesson.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vocabData.map((word: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-bold text-slate-800 text-base">{word.word}</h5>
                            <p className="text-blue-600 font-medium text-sm">{word.translation}</p>
                          </div>
                          {word.audio_url && (
                            <button className="p-1.5 text-slate-300 hover:text-blue-600 transition-colors">
                              <Volume2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t border-slate-50">
                          {word.pronunciation && (
                            <p className="text-xs text-slate-500 italic">[{word.pronunciation}]</p>
                          )}
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-600 italic">"{word.example_en}"</p>
                            <p className="text-xs text-slate-500 mt-1">{word.example_id}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
