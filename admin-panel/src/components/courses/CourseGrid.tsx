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
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
      {courses.map((course: any) => {
        const id = course._id?.$oid || course.id;
        const statusColors: Record<string, string> = {
          published: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          draft: 'bg-amber-50 text-amber-700 border-amber-100',
          archived: 'bg-slate-50 text-slate-500 border-slate-100'
        };

        return (
          <div 
            key={id} 
            className="group bg-white rounded-[1.5rem] border border-slate-100 p-4 flex gap-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/40 hover:border-blue-100 relative"
          >
            {/* Image Section */}
            <div className="w-36 h-36 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-50 border border-slate-50 relative">
              {course.cover_image_url ? (
                <img 
                  src={course.cover_image_url} 
                  alt={course.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                  <BrainCircuit className="h-10 w-10 text-indigo-200" />
                </div>
              )}
              
              {/* Status Badge - Floating on image or next to it */}
              <div className="absolute top-2 left-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md bg-white/80", 
                  statusColors[course.status || (course.is_published ? 'published' : 'draft')]
                )}>
                  {course.status || (course.is_published ? 'published' : 'draft')}
                </span>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col min-w-0 py-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">🇬🇧</span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
                  Level {course.level || 'A1 - C1'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-800 truncate mb-1 group-hover:text-blue-600 transition-colors">
                {course.title}
              </h3>
              
              <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                {course.description || "Master this course content with interactive lessons and AI-driven practice sessions."}
              </p>

              <div className="mt-auto flex items-center justify-between">
                {/* Admin Quick Actions */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openEditModal(course)} 
                    className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Edit Course"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {deleteConfirm === id ? (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                      <button
                        onClick={() => deleteMutation.mutate(id)}
                        className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeleteConfirm(id)} 
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Course"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Main Action Button */}
                <button 
                  onClick={() => openDetailModal(course)}
                  className="px-6 py-1.5 border-2 border-blue-500 text-blue-600 font-bold text-sm rounded-full hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 shadow-sm"
                >
                  Start
                </button>
              </div>
            </div>

            {/* Optional NEW! Badge */}
            {course.status === 'published' && !course.is_paid && (
              <div className="absolute -bottom-2 -left-2 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg rotate-[-5deg] z-10 border-2 border-white">
                NEW!
              </div>
            )}
          </div>
        );
      })}
    </div>
  )
}
