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

import CourseGrid from "../components/courses/CourseGrid"
import ContentTable from "../components/courses/ContentTable"
import DetailModal from "../components/courses/DetailModal"
import HistoryModal from "../components/courses/HistoryModal"
import CreateEditModal from "../components/courses/CreateEditModal"

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

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => {
      if (activeTab === 'courses') return updateCourse(id, data)
      if (activeTab === 'modules') return updateModule(id, data)
      return updateLesson(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] })
    },
    onError: (err: any) => {
      console.error('Toggle publish failed:', err)
      alert('Failed to update publish status.')
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
        <CourseGrid 
          courses={courses} 
          openEditModal={openEditModal} 
          openDetailModal={openDetailModal} 
          deleteConfirm={deleteConfirm} 
          setDeleteConfirm={setDeleteConfirm} 
          deleteMutation={deleteMutation} 
        />
      ) : (
        <ContentTable 
          activeTab={activeTab} 
          currentData={currentData} 
          togglePublishMutation={togglePublishMutation} 
          cloneMutation={cloneMutation} 
          openEditModal={openEditModal} 
          openDetailModal={openDetailModal} 
          deleteConfirm={deleteConfirm} 
          setDeleteConfirm={setDeleteConfirm} 
          deleteMutation={deleteMutation} 
        />
      )}

      <CreateEditModal 
        isModalOpen={isModalOpen}
        activeTab={activeTab}
        editingId={editingId}
        setHistoryEntityId={setHistoryEntityId}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        handleAIHelper={handleAIHelper}
        isGeneratingAI={isGeneratingAI}
        closeModal={closeModal}
        formData={formData}
        setFormData={setFormData}
        handleTranslateField={handleTranslateField}
        translatingField={translatingField}
        handleSubmit={handleSubmit}
        createMutation={createMutation}
        updateMutation={updateMutation}
        courses={courses}
        modules={modules}
      />

      <DetailModal 
        isDetailModalOpen={isDetailModalOpen}
        detailItem={detailItem}
        activeTab={activeTab}
        closeDetailModal={closeDetailModal}
      />

      <HistoryModal 
        isHistoryModalOpen={isHistoryModalOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        versions={versions}
        versionsLoading={versionsLoading}
        rollbackMutation={rollbackMutation}
      />

    </div>
  )
}
