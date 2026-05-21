import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Play, 
  Book, 
  MessageCircle, 
  Star, 
  ChevronRight, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useQuery } from "@tanstack/react-query"
import { getStudentCourses, getCoursePath } from "../../services/api"
import { LearningPath } from "../../components/student-preview/LearningPath"
import { useNavigate } from "react-router-dom"
import FloatingDictionary from "../../components/student/FloatingDictionary"


export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  const { data: courses, isLoading } = useQuery({
    queryKey: ['student-courses'],
    queryFn: getStudentCourses
  })

  useEffect(() => {
    if (courses && courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0]._id?.$oid || courses[0].id)
    }
  }, [courses])

  const currentCourse = courses?.find((c: any) => (c._id?.$oid || c.id) === selectedCourseId) || courses?.[0]
  const courseId = currentCourse?._id?.$oid || currentCourse?.id

  const { data: pathData } = useQuery({
    queryKey: ['coursePath', courseId],
    queryFn: () => getCoursePath(courseId!),
    enabled: !!courseId,
  })

  const firstLessonId = pathData?.modules?.[0]?.lessons?.[0]?._id?.$oid || pathData?.modules?.[0]?.lessons?.[0]?.id

  const handleContinue = () => {
    if (firstLessonId) {
      navigate(`/portal/learn/${firstLessonId}`)
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-20"
    >
      {/* Welcome Section */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0] || "Learner"}! 👋</h2>
          <p className="text-slate-500 mt-1">Ready to continue your journey? You're doing great!</p>
        </div>
        {courses && courses.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Course:</span>
            <select
              value={courseId || ""}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {courses.map((c: any) => (
                <option key={c._id?.$oid || c.id} value={c._id?.$oid || c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Learning Progress */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Resume Learning Card */}
          <motion.div variants={item} className="group relative overflow-hidden bg-blue-600 rounded-[2rem] p-8 text-white shadow-sm transition-all hover:shadow-md">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Current Lesson</span>
                <span className="flex items-center gap-1 text-xs text-blue-100 font-bold">
                  <Clock className="w-3 h-3" /> ~10 mins
                </span>
              </div>
              <h3 className="text-3xl font-black mb-2">{currentCourse?.title || "No Course Enrolled"}</h3>
              <p className="text-blue-100 mb-8 max-w-md">{currentCourse?.description || "Start your learning journey today by selecting a course."}</p>
              
              {courseId && (
                <button 
                  onClick={handleContinue}
                  className="flex items-center gap-3 bg-white text-blue-600 px-6 py-3.5 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <Play className="w-5 h-5 fill-blue-600" />
                  Continue Learning
                </button>
              )}
            </div>
            
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 right-12 w-32 h-32 opacity-20 pointer-events-none group-hover:scale-110 transition-transform">
              <Book className="w-full h-full" />
            </div>
          </motion.div>

          {/* Learning Path Visualizer */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900">Your Learning Path</h4>
              <span className="text-blue-600 text-sm font-bold">Step by Step</span>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
              {courseId ? (
                <LearningPath courseId={courseId} />
              ) : (
                <div className="p-12 text-center text-slate-400">
                  Select a course to see your path.
                </div>
              )}
            </div>
          </section>

          {/* Activity Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900">Suggested Drills</h4>
              <button className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DrillCard 
                title="Table Service Vocab" 
                category="Hospitality" 
                level="Beginner" 
                xp={50} 
                icon={<MessageCircle className="w-5 h-5" />} 
              />
              <DrillCard 
                title="Complaint Handling" 
                category="Soft Skills" 
                level="Intermediate" 
                xp={100} 
                icon={<Star className="w-5 h-5" />} 
              />
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Goals */}
        <div className="space-y-8">
          
          {/* Progress Overview Card */}
          <motion.div variants={item} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-6">Learning Goal</h4>
            
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-black text-slate-900">2,450</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">XP Earned</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">82%</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target: 3,000</p>
                </div>
              </div>
              
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "82%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                />
              </div>

              <div className="pt-4 border-t border-slate-50 space-y-3">
                <StatRow icon={<TrendingUp className="w-4 h-4 text-green-500" />} label="Daily Rank" value="#4" />
                <StatRow icon={<CheckCircle2 className="w-4 h-4 text-blue-500" />} label="Lessons Done" value="18" />
              </div>
            </div>
          </motion.div>

          {/* Quick Vocab Card */}
          <motion.div variants={item} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4 text-sm">Vocabulary Mastered</h4>
            <div className="flex flex-wrap gap-2">
              {['Complimentary', 'Reservation', 'Amenities', 'Itinerary', 'Concierge'].map(word => (
                <span key={word} className="px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 border border-slate-100">
                  {word}
                </span>
              ))}
              <button className="px-3 py-1.5 bg-blue-50 rounded-xl text-xs font-bold text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors">
                +12 more
              </button>
            </div>
          </motion.div>

        </div>
      </div>
      <FloatingDictionary />
    </motion.div>
  )
}

function DrillCard({ title, category, level, xp, icon }: any) {
  return (
    <div className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white">
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{category}</span>
      </div>
      <h5 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{title}</h5>
      <div className="flex items-center gap-4 mt-3">
        <span className="text-xs font-bold text-slate-500">{level}</span>
        <div className="h-1 w-1 rounded-full bg-slate-300" />
        <span className="text-xs font-bold text-blue-600">+{xp} XP</span>
      </div>
    </div>
  )
}

function StatRow({ icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold text-slate-500">{label}</span>
      </div>
      <span className="text-xs font-black text-slate-900">{value}</span>
    </div>
  )
}
