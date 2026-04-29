import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, MoreVertical, Edit, Trash, Eye, X } from "lucide-react"
import { 
  getCourses, createCourse, updateCourse, deleteCourse,
  getModules, createModule, updateModule, deleteModule,
  getLessons, createLesson, updateLesson, deleteLesson
} from "../services/api"
import { cn, normalizeDate } from "../lib/utils"

export default function Courses() {
  const [activeTab, setActiveTab] = useState<'courses'|'modules'|'lessons'>('courses')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<any>({ 
    title: '', description: '', category: 'hotel', level: 'beginner',
    course_id: '', module_id: '', content: '', xp_reward: 10
  })

  const queryClient = useQueryClient()

  // Queries
  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
  })

  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: getModules,
  })

  const { data: lessonsData, isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons'],
    queryFn: getLessons,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (activeTab === 'courses') return createCourse(data)
      if (activeTab === 'modules') return createModule(data)
      return createLesson(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] })
      closeModal()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => {
      if (activeTab === 'courses') return updateCourse(id, data)
      if (activeTab === 'modules') return updateModule(id, data)
      return updateLesson(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] })
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (activeTab === 'courses') return deleteCourse(id)
      if (activeTab === 'modules') return deleteModule(id)
      return deleteLesson(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] })
      setDeleteConfirm(null)
    }
  })

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({ 
      title: '', description: '', category: 'hotel', level: 'beginner',
      course_id: courses?.[0]?._id?.$oid || courses?.[0]?.id || '', 
      module_id: modules?.[0]?._id?.$oid || modules?.[0]?.id || '', 
      content: '', xp_reward: 10 
    })
    setIsModalOpen(true)
  }

  const openEditModal = (item: any) => {
    const id = item._id?.$oid || item.id
    setEditingId(id)
    setFormData({ ...item })
    setIsModalOpen(true)
  }

  const openDetailModal = (item: any) => {
    setDetailItem(item)
    setIsDetailModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  const closeDetailModal = () => {
    setIsDetailModalOpen(false)
    setDetailItem(null)
  }

  const handleSubmit = () => {
    // Clean up data based on active tab
    const payload = { ...formData }
    
    if (activeTab === 'courses') {
      delete payload.course_id; delete payload.module_id; delete payload.content; delete payload.xp_reward;
    } else if (activeTab === 'modules') {
      delete payload.category; delete payload.level; delete payload.module_id; delete payload.content; delete payload.xp_reward;
      if (payload.course_id?.$oid) payload.course_id = payload.course_id.$oid;
    } else {
      if (payload.module_id?.$oid) payload.module_id = payload.module_id.$oid;
      payload.xp_reward = Number(payload.xp_reward);
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const courses = coursesData?.data || coursesData || []
  const modules = modulesData?.data || modulesData || []
  const lessons = lessonsData?.data || lessonsData || []

  let currentData = []
  if (activeTab === 'courses') currentData = courses
  if (activeTab === 'modules') currentData = modules
  if (activeTab === 'lessons') currentData = lessons

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex bg-slate-100/50 p-1 rounded-xl backdrop-blur-sm">
          {(['courses', 'modules', 'lessons'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all duration-200",
                activeTab === tab ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <button 
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create {activeTab.slice(0, -1)}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                {activeTab === 'courses' && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>}
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
                      <div className="font-medium text-slate-800">{item.title}</div>
                      <div className="text-xs text-slate-400 mt-1">ID: {id}</div>
                    </td>
                    
                    {activeTab === 'courses' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {item.category}
                        </span>
                      </td>
                    )}
                    
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
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {item.is_published ? 'Published' : 'Draft'}
                      </span>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-slate-800">
                {editingId ? 'Edit' : 'Create'} {activeTab.slice(0, -1).replace(/^\w/, c => c.toUpperCase())}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              
              {/* Common Fields */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <input 
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all" 
                  value={formData.title || ''} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  placeholder="Title..."
                />
              </div>

              {(activeTab === 'courses' || activeTab === 'modules') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                  <textarea 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all min-h-[80px] resize-none" 
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Description..."
                  />
                </div>
              )}

              {activeTab === 'lessons' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Content (Markdown)</label>
                  <textarea 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all min-h-[120px] resize-none font-mono" 
                    value={formData.content || ''} 
                    onChange={e => setFormData({...formData, content: e.target.value})} 
                    placeholder="Lesson content..."
                  />
                </div>
              )}

              {activeTab === 'modules' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Course</label>
                  <select 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.course_id?.$oid || formData.course_id || ''}
                    onChange={e => setFormData({...formData, course_id: e.target.value})}
                  >
                    <option value="" disabled>Select a course</option>
                    {courses.map((c: any) => {
                      const cid = c._id?.$oid || c.id;
                      return <option key={cid} value={cid}>{c.title}</option>
                    })}
                  </select>
                </div>
              )}

              {activeTab === 'lessons' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Module</label>
                  <select 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.module_id?.$oid || formData.module_id || ''}
                    onChange={e => setFormData({...formData, module_id: e.target.value})}
                  >
                    <option value="" disabled>Select a module</option>
                    {modules.map((m: any) => {
                       const mid = m._id?.$oid || m.id;
                       return <option key={mid} value={mid}>{m.title}</option>
                    })}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {(activeTab === 'courses' || activeTab === 'lessons') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                      <select 
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" 
                        value={formData.category || 'hotel'} 
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="hotel">Hotel</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="cruise">Cruise</option>
                        <option value="interview">Interview</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Level</label>
                      <select 
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" 
                        value={formData.level || 'beginner'} 
                        onChange={e => setFormData({...formData, level: e.target.value})}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </>
                )}
                
                {activeTab === 'lessons' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">XP Reward</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" 
                      value={formData.xp_reward || 0} 
                      onChange={e => setFormData({...formData, xp_reward: e.target.value})} 
                    />
                  </div>
                )}

                {editingId && (
                   <div className="col-span-2 flex items-center mt-2">
                     <input
                       type="checkbox"
                       id="is_published"
                       checked={!!formData.is_published}
                       onChange={e => setFormData({...formData, is_published: e.target.checked})}
                       className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                     />
                     <label htmlFor="is_published" className="text-sm font-medium text-slate-700">
                       Published
                     </label>
                   </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 sticky bottom-0 z-10">
              <button 
                onClick={closeModal} 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || updateMutation.isPending || !formData.title?.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && detailItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-slate-800 capitalize">
                {activeTab.slice(0, -1)} Details
              </h3>
              <button onClick={closeDetailModal} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 space-y-4">
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
            
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50 sticky bottom-0 z-10">
              <button 
                onClick={closeDetailModal} 
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
