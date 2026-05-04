import { BrainCircuit, Edit, Globe, Trash, Check, X } from "lucide-react"
import { cn } from "../../lib/utils"

interface CourseGridProps {
  courses: any[]
  openEditModal: (item: any) => void
  openDetailModal: (item: any) => void
  deleteConfirm: string | null
  setDeleteConfirm: (id: string | null) => void
  deleteMutation: any
}

export default function CourseGrid({
  courses,
  openEditModal,
  openDetailModal,
  deleteConfirm,
  setDeleteConfirm,
  deleteMutation
}: CourseGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course: any) => {
        const id = course._id?.$oid || course.id;
        const statusColors: Record<string, string> = {
          published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          draft: 'bg-amber-50 text-amber-700 border-amber-200',
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
                  {deleteConfirm === id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate(id)}
                        className="p-1 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
}
