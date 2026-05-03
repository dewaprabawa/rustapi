import { Sparkles, Eye, Copy, Edit, Trash, X } from "lucide-react"
import { cn } from "../../lib/utils"

interface ContentTableProps {
  activeTab: 'courses' | 'modules' | 'lessons'
  currentData: any[]
  togglePublishMutation: any
  cloneMutation: any
  openEditModal: (item: any) => void
  openDetailModal: (item: any) => void
  deleteConfirm: string | null
  setDeleteConfirm: (id: string | null) => void
  deleteMutation: any
}

export default function ContentTable({
  activeTab,
  currentData,
  togglePublishMutation,
  cloneMutation,
  openEditModal,
  openDetailModal,
  deleteConfirm,
  setDeleteConfirm,
  deleteMutation
}: ContentTableProps) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
              {activeTab !== 'modules' && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</th>}
              {activeTab === 'modules' && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Course ID</th>}
              {activeTab === 'lessons' && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">XP</th>}
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentData.map((item: any) => {
              const id = item._id?.$oid || item.id
              return (
                <tr key={id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      {item.title}
                      {item.source === "ai_generated" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 uppercase tracking-wider">
                          <Sparkles className="h-3 w-3" /> AI
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">ID: {id}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 line-clamp-2 max-w-[200px] whitespace-normal">
                      {item.description || item.content || <span className="text-slate-300 italic">No description</span>}
                    </div>
                  </td>

                  {activeTab !== 'modules' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
                        {item.level}
                      </span>
                    </td>
                  )}

                  {activeTab === 'modules' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-500">{item.course_id?.$oid || item.course_id}</span>
                    </td>
                  )}

                  {activeTab === 'lessons' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-amber-600">{item.xp_reward || 0} XP</span>
                    </td>
                  )}

                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => togglePublishMutation.mutate({ 
                        id, 
                        data: { is_published: !item.is_published } 
                      })}
                      disabled={togglePublishMutation.isPending}
                      className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                        item.is_published 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                          : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
                        togglePublishMutation.isPending && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {item.is_published ? 'Published' : 'Draft'}
                    </button>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openDetailModal(item)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => cloneMutation.mutate(id)}
                        disabled={cloneMutation.isPending}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Clone"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {deleteConfirm === id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMutation.mutate(id)}
                            className="px-2.5 py-1 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {currentData.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">
            No {activeTab} found.
          </div>
        )}
      </div>
    </div>
  )
}
