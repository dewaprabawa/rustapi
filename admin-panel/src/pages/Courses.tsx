import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, MoreVertical, Edit, Trash, Eye, X, Loader2, Sparkles, Globe, History, RotateCcw, Copy, BrainCircuit, Check } from "lucide-react"
import {
  getCourses, createCourse, updateCourse, deleteCourse,
  getModules, createModule, updateModule, deleteModule,
  getLessons, createLesson, updateLesson, deleteLesson,
  translateText, aiGenerateContent, getContentVersions, rollbackContentVersion, cloneContent
} from "../services/api"
import { cn, normalizeDate } from "../lib/utils"

export default function Courses() {
  const [activeTab, setActiveTab] = useState<'courses' | 'modules' | 'lessons'>('courses')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [formData, setFormData] = useState<any>({
    title: '', title_id: '', description: '', description_id: '',
    category: 'general', level: 'a1', status: 'draft',
    skill_focus: [], target_age: 'all', estimated_duration: '4 weeks',
    is_paid: false, enrollment_cap: null, visibility: 'public',
    course_id: '', module_id: '', content: '', xp_reward: 10,
    tags: [], cover_image_url: ''
  })

  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [translatingField, setTranslatingField] = useState<string | null>(null)

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyEntityId, setHistoryEntityId] = useState<string | null>(null)

  const handleAIHelper = async () => {
    setIsGeneratingAI(true)
    try {
      const context = `${formData.category || 'hotel'} ${formData.level || 'beginner'}`
      const data = await aiGenerateContent(activeTab.slice(0, -1), context)

      const safeData = { ...data }
      const fieldsToCheck = ['content', 'content_id', 'description', 'description_id', 'instruction', 'instruction_id', 'culture_notes']
      for (const field of fieldsToCheck) {
        if (safeData[field] && typeof safeData[field] === 'object') {
          safeData[field] = JSON.stringify(safeData[field], null, 2)
        }
      }

      setFormData((prev: any) => ({ ...prev, ...safeData }))
    } catch (err: any) {
      if (err?.response?.status === 404) {
        alert("No active API key found. Go to Settings → API Keys to add one.")
      } else {
        alert("Failed to generate. Check your API key in Settings.")
      }
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleTranslateField = async (sourceField: string, targetField: string) => {
    const text = formData[sourceField]
    if (!text?.trim()) return
    setTranslatingField(targetField)
    try {
      const data = await translateText(text)
      setFormData((prev: any) => ({ ...prev, [targetField]: data.translated || data }))
    } catch (err: any) {
      if (err?.response?.status === 404) {
        alert("No active API key. Go to Settings → API Keys.")
      } else {
        alert("Translation failed. Check your API key.")
      }
    } finally {
      setTranslatingField(null)
    }
  }

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

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['versions', activeTab, historyEntityId],
    queryFn: () => getContentVersions(activeTab.slice(0, -1), historyEntityId!),
    enabled: !!historyEntityId && isHistoryModalOpen,
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
    },
    onError: (err: any) => {
      console.error('Create failed:', err)
      const msg = typeof err?.response?.data === 'string' ? err.response.data : (err?.response?.data?.message || err.message || 'Unknown error');
      alert(`Failed to create: ${msg}`)
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
    },
    onError: (err: any) => {
      console.error('Update failed:', err)
      const msg = typeof err?.response?.data === 'string' ? err.response.data : (err?.response?.data?.message || err.message || 'Unknown error');
      alert(`Failed to update: ${msg}`)
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

  const rollbackMutation = useMutation({
    mutationFn: (version: number) => rollbackContentVersion(activeTab.slice(0, -1), historyEntityId!, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] })
      setIsHistoryModalOpen(false)
      setIsModalOpen(false)
      alert("Rollback successful! Data has been restored.")
    }
  })

  const cloneMutation = useMutation({
    mutationFn: (id: string) => cloneContent(activeTab.slice(0, -1), id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] })
    }
  })

  const openCreateModal = () => {
    setEditingId(null)
    setFormData({
      title: '', title_id: '', description: '', description_id: '',
      category: 'general', level: 'a1', status: 'draft',
      skill_focus: [], target_age: 'all', estimated_duration: '4 weeks',
      is_paid: false, enrollment_cap: null, visibility: 'public',
      course_id: courses?.[0]?._id?.$oid || courses?.[0]?.id || '',
      module_id: modules?.[0]?._id?.$oid || modules?.[0]?.id || '',
      content: '', content_id: '', xp_reward: 10,
      instruction: '', instruction_id: '', culture_notes: '',
      tags: [], cover_image_url: ''
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

    // Strip internal fields that should never be sent
    delete payload._id; delete payload.id; delete payload.created_at; delete payload.updated_at;

    if (activeTab === 'courses') {
      delete payload.course_id; delete payload.module_id; delete payload.content; delete payload.content_id;
      delete payload.xp_reward; delete payload.instruction; delete payload.instruction_id; delete payload.culture_notes;
    } else if (activeTab === 'modules') {
      delete payload.module_id; delete payload.content; delete payload.content_id; delete payload.xp_reward;
      delete payload.category; delete payload.level; delete payload.instruction; delete payload.instruction_id; delete payload.culture_notes;
      delete payload.status; delete payload.skill_focus; delete payload.target_age;
      delete payload.estimated_duration; delete payload.is_paid; delete payload.enrollment_cap; delete payload.visibility;
      if (payload.course_id?.$oid) payload.course_id = payload.course_id.$oid;
    } else {
      delete payload.course_id; delete payload.description; delete payload.description_id;
      delete payload.status; delete payload.skill_focus; delete payload.target_age;
      delete payload.estimated_duration; delete payload.is_paid; delete payload.enrollment_cap; delete payload.visibility;
      delete payload.prerequisite_id; delete payload.passing_score_threshold; delete payload.is_optional;
      if (payload.module_id?.$oid) payload.module_id = payload.module_id.$oid;
      payload.xp_reward = Number(payload.xp_reward) || 10;
    }

    // Sync is_published ↔ status for courses
    if (activeTab === 'courses') {
      if (payload.is_published === true && payload.status === 'draft') {
        payload.status = 'published'
      } else if (payload.is_published === false && payload.status === 'published') {
        payload.status = 'draft'
      }
    }

    // Convert tags string to array
    if (typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
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
      {/* ====== Summary Stats Section (Section 1.1) ====== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Courses', value: courses.length, icon: BrainCircuit, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Learners', value: '2,481', icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Avg Completion', value: '67%', icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Review', value: courses.filter((c: any) => c.status === 'inreview').length, icon: Loader2, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", stat.bg)}>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex bg-slate-100/50 p-1 rounded-xl backdrop-blur-sm border border-slate-200">
          {(['courses', 'modules', 'lessons'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all duration-200",
                activeTab === tab ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create {activeTab.slice(0, -1)}
        </button>
      </div>

      {activeTab === 'courses' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => {
            const id = course._id?.$oid || course.id;
            const statusColors: any = {
              published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              draft: 'bg-slate-100 text-slate-600 border-slate-200',
              inreview: 'bg-amber-50 text-amber-700 border-amber-200',
              archived: 'bg-rose-50 text-rose-700 border-rose-200'
            };
            return (
              <div key={id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col">
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  {course.cover_image_url ? (
                    <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                      <BrainCircuit className="h-12 w-12 text-indigo-200" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", statusColors[course.status || (course.is_published ? 'published' : 'draft')])}>
                      {course.status || (course.is_published ? 'published' : 'draft')}
                    </span>
                    {course.is_paid && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white border border-indigo-700 shadow-sm">
                        PREMIUM
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                    <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 uppercase">
                      {course.level}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                    {course.description || "No description provided."}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {(course.skill_focus || []).slice(0, 3).map((skill: string) => (
                      <span key={skill} className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100 capitalize font-medium">
                        {skill}
                      </span>
                    ))}
                    {(course.skill_focus || []).length > 3 && (
                      <span className="text-[10px] text-slate-400">+{course.skill_focus.length - 3}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Students</span>
                        <span className="text-xs font-bold text-slate-700">{course.enrollment_cap ? `Cap: ${course.enrollment_cap}` : 'Unlimited'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Duration</span>
                        <span className="text-xs font-bold text-slate-700">{course.estimated_duration || 'Self-paced'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(course)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => openDetailModal(course)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Globe className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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
                        <div className="font-medium text-slate-800">{item.title}</div>
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
                            onClick={() => cloneMutation.mutate(id)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {editingId ? 'Edit' : 'Create'} {activeTab.slice(0, -1).replace(/^\w/, c => c.toUpperCase())}
              </h3>
              <div className="flex items-center gap-2">
                {editingId && (
                  <button onClick={() => {
                    setHistoryEntityId(editingId)
                    setIsHistoryModalOpen(true)
                  }} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition-colors border border-slate-200">
                    <History className="h-4 w-4" />
                    History
                  </button>
                )}
                <button
                  onClick={handleAIHelper}
                  disabled={isGeneratingAI}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-medium rounded-lg transition-colors border border-indigo-100 disabled:opacity-50"
                  title="Generate content using AI"
                >
                  {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  AI Generate
                </button>

                <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">

              {/* ====== Bilingual Fields ====== */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title EN */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">🇬🇧 Title</label>
                  <input
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    value={formData.title || ''}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="English title..."
                  />
                </div>
                {/* Title ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between">
                    <span>🇮🇩 Judul</span>
                    <button
                      onClick={() => handleTranslateField('title', 'title_id')}
                      disabled={translatingField === 'title_id' || typeof formData.title !== 'string' || !formData.title.trim()}
                      className="text-xs text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 flex items-center gap-1"
                    >
                      {translatingField === 'title_id' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                      Translate
                    </button>
                  </label>
                  <input
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    value={formData.title_id || ''}
                    onChange={e => setFormData({ ...formData, title_id: e.target.value })}
                    placeholder="Judul dalam Bahasa Indonesia..."
                  />
                </div>
              </div>

              {(activeTab === 'courses' || activeTab === 'modules') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Description EN */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">🇬🇧 Description</label>
                    <textarea
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all min-h-[150px] resize-y"
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="English description..."
                    />
                  </div>
                  {/* Description ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between">
                      <span>🇮🇩 Deskripsi</span>
                      <button
                        onClick={() => handleTranslateField('description', 'description_id')}
                        disabled={translatingField === 'description_id' || typeof formData.description !== 'string' || !formData.description.trim()}
                        className="text-xs text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 flex items-center gap-1"
                      >
                        {translatingField === 'description_id' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                        Translate
                      </button>
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all min-h-[150px] resize-y"
                      value={formData.description_id || ''}
                      onChange={e => setFormData({ ...formData, description_id: e.target.value })}
                      placeholder="Deskripsi dalam Bahasa Indonesia..."
                    />
                  </div>
                </div>
              )}

              {activeTab === 'lessons' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Content EN */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">🇬🇧 Content</label>
                    <textarea
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all min-h-[400px] resize-y font-mono leading-relaxed"
                      value={formData.content || ''}
                      onChange={e => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Lesson content in English..."
                    />
                  </div>
                  {/* Content ID */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between">
                      <span>🇮🇩 Konten</span>
                      <button
                        onClick={() => handleTranslateField('content', 'content_id')}
                        disabled={translatingField === 'content_id' || typeof formData.content !== 'string' || !formData.content.trim()}
                        className="text-xs text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 flex items-center gap-1"
                      >
                        {translatingField === 'content_id' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                        Translate
                      </button>
                    </label>
                    <textarea
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all min-h-[400px] resize-y font-mono leading-relaxed"
                      value={formData.content_id || ''}
                      onChange={e => setFormData({ ...formData, content_id: e.target.value })}
                      placeholder="Konten dalam Bahasa Indonesia..."
                    />
                  </div>
                </div>
              )}

              {activeTab === 'modules' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Course</label>
                      <select
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={formData.course_id?.$oid || formData.course_id || ''}
                        onChange={e => setFormData({ ...formData, course_id: e.target.value })}
                      >
                        <option value="" disabled>Select a course</option>
                        {courses.map((c: any) => {
                          const cid = c._id?.$oid || c.id;
                          return <option key={cid} value={cid}>{c.title}</option>
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Prerequisite Module (Optional)</label>
                      <select
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={formData.prerequisite_id?.$oid || formData.prerequisite_id || ''}
                        onChange={e => setFormData({ ...formData, prerequisite_id: e.target.value })}
                      >
                        <option value="">No Prerequisite</option>
                        {modules
                          .filter((m: any) => (m.course_id?.$oid || m.course_id) === (formData.course_id?.$oid || formData.course_id))
                          .map((m: any) => {
                            const mid = m._id?.$oid || m.id;
                            if (mid === editingId) return null;
                            return <option key={mid} value={mid}>{m.title}</option>
                          })}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Pass Score Threshold (%)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={formData.passing_score_threshold || ''}
                        onChange={e => setFormData({ ...formData, passing_score_threshold: parseInt(e.target.value) })}
                        placeholder="e.g. 70"
                      />
                    </div>
                    <div className="flex items-center pt-8">
                      <input
                        type="checkbox"
                        id="is_optional"
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        checked={!!formData.is_optional}
                        onChange={e => setFormData({ ...formData, is_optional: e.target.checked })}
                      />
                      <label htmlFor="is_optional" className="ml-2 text-sm font-medium text-slate-700 cursor-pointer">Optional (Bonus) Module</label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lessons' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Module</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={formData.module_id?.$oid || formData.module_id || ''}
                      onChange={e => setFormData({ ...formData, module_id: e.target.value })}
                    >
                      <option value="" disabled>Select a module</option>
                      {modules.map((m: any) => {
                        const mid = m._id?.$oid || m.id;
                        return <option key={mid} value={mid}>{m.title}</option>
                      })}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">🇬🇧 Instruction</label>
                      <textarea
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[80px]"
                        value={formData.instruction || ''}
                        onChange={e => setFormData({ ...formData, instruction: e.target.value })}
                        placeholder="e.g. Fill in the blank below"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between">
                        <span>🇮🇩 Instruksi</span>
                        <button
                          onClick={() => handleTranslateField('instruction', 'instruction_id')}
                          disabled={translatingField === 'instruction_id' || !formData.instruction?.trim()}
                          className="text-xs text-indigo-600 hover:text-indigo-700 disabled:text-slate-300"
                        >
                          Translate
                        </button>
                      </label>
                      <textarea
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[80px]"
                        value={formData.instruction_id || ''}
                        onChange={e => setFormData({ ...formData, instruction_id: e.target.value })}
                        placeholder="e.g. Isi titik-titik berikut ini"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Culture Notes (Optional)</label>
                    <textarea
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[100px]"
                      value={formData.culture_notes || ''}
                      onChange={e => setFormData({ ...formData, culture_notes: e.target.value })}
                      placeholder="Add cultural tips for Indonesian learners..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">XP Reward</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={formData.xp_reward || 0}
                      onChange={e => setFormData({ ...formData, xp_reward: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              {(activeTab === 'courses' || activeTab === 'lessons') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={formData.category || 'general'}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="hotel">Hotel</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="cruise">Cruise</option>
                      <option value="interview">Interview</option>
                      <option value="general">General</option>
                      <option value="business">Business</option>
                      <option value="travel">Travel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Level (CEFR)</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={formData.level || 'a1'}
                      onChange={e => setFormData({ ...formData, level: e.target.value })}
                    >
                      <option value="a1">A1 Beginner</option>
                      <option value="a2">A2 Elementary</option>
                      <option value="b1">B1 Intermediate</option>
                      <option value="b2">B2 Upper Intermediate</option>
                      <option value="c1">C1 Advanced</option>
                      <option value="c2">C2 Mastery</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Age</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={formData.target_age || 'all'}
                      onChange={e => setFormData({ ...formData, target_age: e.target.value })}
                    >
                      <option value="kids">Kids (7-12)</option>
                      <option value="teens">Teens (13-17)</option>
                      <option value="adults">Adults (18+)</option>
                      <option value="all">All Ages</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'courses' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Estimated Duration</label>
                      <input
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={formData.estimated_duration || ''}
                        onChange={e => setFormData({ ...formData, estimated_duration: e.target.value })}
                        placeholder="e.g. 4 weeks · 2 hrs/week"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Visibility</label>
                      <select
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={formData.visibility || 'public'}
                        onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                      >
                        <option value="public">Public (Visible to all)</option>
                        <option value="private">Private (Direct link only)</option>
                        <option value="unlisted">Unlisted (Hidden from search)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Skill Focus</label>
                    <div className="flex flex-wrap gap-2">
                      {['speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary', 'pronunciation'].map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            const current = formData.skill_focus || [];
                            const next = current.includes(skill)
                              ? current.filter((s: string) => s !== skill)
                              : [...current, skill];
                            setFormData({ ...formData, skill_focus: next });
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                            (formData.skill_focus || []).includes(skill)
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {skill.charAt(0).toUpperCase() + skill.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_paid"
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          checked={!!formData.is_paid}
                          onChange={e => setFormData({ ...formData, is_paid: e.target.checked })}
                        />
                        <label htmlFor="is_paid" className="text-sm font-medium text-slate-700 cursor-pointer">Paid Course</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-700">Status:</label>
                        <select
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          value={formData.status || 'draft'}
                          onChange={e => {
                            const newStatus = e.target.value
                            setFormData({ ...formData, status: newStatus, is_published: newStatus === 'published' })
                          }}
                        >
                          <option value="draft">Draft</option>
                          <option value="inreview">In Review</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Enrollment Cap (optional)</label>
                      <input
                        type="number"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                        value={formData.enrollment_cap || ''}
                        onChange={e => setFormData({ ...formData, enrollment_cap: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Limit students..."
                      />
                    </div>
                  </div>
                </>
              )}



              {editingId && (
                <div className="col-span-2 flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={!!formData.is_published}
                    onChange={e => setFormData({ ...formData, is_published: e.target.checked })}
                    className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_published" className="text-sm font-medium text-slate-700">
                    Published
                  </label>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags (comma separated)</label>
                <input
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                  value={Array.isArray(formData.tags) ? formData.tags.join(', ') : (formData.tags || '')}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g. grammar, vocabulary, speaking..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 flex-shrink-0">
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
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" /> Version History
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              {versionsLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
              ) : versions?.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No version history available for this item yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {versions?.map((v: any, idx: number) => (
                    <div key={v.version} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors group">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-sm">
                        v{v.version}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{v.change_summary || "Auto-saved edit"}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(v.created_at.$date || v.created_at).toLocaleString()} • by {v.changed_by}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to rollback to version ${v.version}? Current changes will be saved as a new version.`)) {
                                rollbackMutation.mutate(v.version)
                              }
                            }}
                            disabled={rollbackMutation.isPending}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 text-slate-600 text-xs font-medium rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

