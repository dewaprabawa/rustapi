import { useState, useEffect } from "react"
import { 
  Book, 
  Plus, 
  FileText, 
  Wand2, 
  Download, 
  CheckCircle2, 
  ChevronRight, 
  Library,
  Settings2,
  BookMarked,
  Layers,
  Loader2,
  X,
  Upload,
  File,
  ExternalLink,
  Eye,
  Sparkles,
  BookOpen,
  Save
} from "lucide-react"
import { cn } from "../lib/utils"
import { useRef } from "react"
import { getCurriculum, getBooks, uploadBook, generateEbook, exportEbook, updateEbook } from "../services/api"

interface CurriculumLesson {
  number: number
  title: string
  objectives: string[]
}

interface CurriculumModule {
  number: number
  title: string
  lessons: CurriculumLesson[]
}

interface CurriculumCourse {
  number: number
  title: string
  modules: CurriculumModule[]
}

interface CurriculumStage {
  _id: string
  number: number
  title: string
  courses: CurriculumCourse[]
}

interface ReferenceBook {
  _id: string
  title: string
  status: string
  created_at: string
}

export default function EbookForge() {
  const [stages, setStages] = useState<CurriculumStage[]>([])
  const [books, setBooks] = useState<ReferenceBook[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  
  // Selection State
  const [selectedStage, setSelectedStage] = useState<number | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [selectedModule, setSelectedModule] = useState<number | null>(null)
  const [selectedLessons, setSelectedLessons] = useState<number[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string>("")
  
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newBookTitle, setNewBookTitle] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [generatedEbookId, setGeneratedEbookId] = useState<string | null>(null)
  const [generatedLessons, setGeneratedLessons] = useState<any[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [stagesData, booksData] = await Promise.all([
        getCurriculum(),
        getBooks()
      ])
      setStages(stagesData)
      setBooks(booksData)
    } catch (error) {
      console.error("Failed to fetch ebook data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedStage || !selectedCourse) return
    
    setGenerating(true)
    try {
      const data = await generateEbook({
        stage: selectedStage,
        course: selectedCourse,
        module: selectedModule || 1,
        lessons: selectedLessons.length > 0 ? selectedLessons : [1, 2, 3, 4, 5],
        level: selectedStage === 1 ? "A1" : selectedStage === 2 ? "A2" : selectedStage === 3 ? "B1" : "B2",
        reference_book_id: selectedBookId || undefined
      })
      setGeneratedEbookId(data.id)
      setGeneratedLessons(data.lessons || [])
    } catch (error) {
      console.error("Generation failed:", error)
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async () => {
    if (!generatedEbookId) return
    try {
      const data = await exportEbook(generatedEbookId)
      setDownloadUrl(data.download_url)
      // Open in new tab if URL is real
      if (data.download_url.startsWith("http")) {
        window.open(data.download_url, "_blank")
      }
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  const handleUpdateLesson = (index: number, field: string, value: string) => {
    const updated = [...generatedLessons]
    updated[index] = { ...updated[index], [field]: value }
    setGeneratedLessons(updated)
  }

  const handleSaveChanges = async () => {
    if (!generatedEbookId) return
    setSaving(true)
    try {
      await updateEbook(generatedEbookId, { lessons: generatedLessons })
      setIsEditing(false)
    } catch (error) {
      console.error("Save failed:", error)
    } finally {
      setSaving(false)
    }
  }

  const toggleLesson = (num: number) => {
    setSelectedLessons(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    )
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBookTitle) return

    setUploading(true)
    try {
      await uploadBook({
        title: newBookTitle,
        status: "analyzed"
      })
      setShowUploadModal(false)
      setNewBookTitle("")
      setSelectedFile(null)
      fetchData()
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!newBookTitle) {
        // Auto-fill title from filename without extension
        setNewBookTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "))
      }
    }
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const currentStageData = stages.find(s => s.number === selectedStage)
  const currentCourseData = currentStageData?.courses.find(c => c.number === selectedCourse)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BookMarked className="h-8 w-8 text-blue-600" />
            Ebook Forge
          </h1>
          <p className="text-slate-500 mt-2">
            Generate immersive lesson materials powered by AI and reference textbooks.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Upload Textbook
          </button>
          
          <button 
            disabled={!selectedCourse || generating}
            onClick={handleGenerate}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20",
              !selectedCourse || generating
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            {generating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Wand2 className="h-5 w-5" />
            )}
            {generating ? "Crafting Content..." : "Generate Ebook"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Curriculum Selection */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stage Selection */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Step 1: Select Stage
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stages.map((stage) => (
                <button
                  key={stage._id}
                  onClick={() => {
                    setSelectedStage(stage.number)
                    setSelectedCourse(null)
                    setSelectedModule(null)
                  }}
                  className={cn(
                    "relative p-4 rounded-xl border text-left transition-all group",
                    selectedStage === stage.number 
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" 
                      : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200"
                  )}
                >
                  <span className="text-xs font-bold text-blue-600 mb-1 block">STAGE {stage.number}</span>
                  <span className={cn(
                    "text-sm font-semibold transition-colors",
                    selectedStage === stage.number ? "text-blue-900" : "text-slate-700"
                  )}>
                    {stage.title}
                  </span>
                  {selectedStage === stage.number && (
                    <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Course Selection */}
          {selectedStage && (
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Library className="h-4 w-4" />
                Step 2: Select Course Path
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentStageData?.courses.map((course) => (
                  <button
                    key={course.number}
                    onClick={() => {
                      setSelectedCourse(course.number)
                      setSelectedModule(null)
                      setSelectedLessons([])
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all group",
                      selectedCourse === course.number 
                        ? "border-blue-500 bg-blue-50/50 shadow-sm" 
                        : "border-slate-100 bg-white hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center font-bold",
                        selectedCourse === course.number ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                      )}>
                        {course.number}
                      </div>
                      <div className="text-left">
                        <span className={cn(
                          "text-sm font-semibold block",
                          selectedCourse === course.number ? "text-blue-900" : "text-slate-700"
                        )}>
                          {course.title}
                        </span>
                        <span className="text-xs text-slate-400">10 Comprehensive Lessons</span>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform",
                      selectedCourse === course.number ? "text-blue-600 translate-x-1" : "text-slate-300"
                    )} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Module & Lesson Checklist */}
          {selectedCourse && (
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Step 3: Refine Lesson Content
                </div>
                <button 
                  onClick={() => setSelectedLessons(currentCourseData?.modules.flatMap(m => m.lessons.map(l => l.number)) || [])}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Select All
                </button>
              </h3>
              
              <div className="space-y-8">
                {currentCourseData?.modules.map((module) => (
                  <div key={module.number} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        Module {module.number}: {module.title}
                      </span>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {module.lessons.map((lesson) => (
                        <div 
                          key={lesson.number}
                          onClick={() => toggleLesson(lesson.number)}
                          className={cn(
                            "group cursor-pointer p-3 rounded-xl border transition-all flex items-start gap-3",
                            selectedLessons.includes(lesson.number)
                              ? "bg-blue-50/30 border-blue-200 shadow-sm shadow-blue-600/5"
                              : "bg-white border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <div className={cn(
                            "h-5 w-5 rounded border mt-0.5 flex items-center justify-center transition-all",
                            selectedLessons.includes(lesson.number)
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          )}>
                            {selectedLessons.includes(lesson.number) && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <div>
                            <span className={cn(
                              "text-sm font-medium block",
                              selectedLessons.includes(lesson.number) ? "text-blue-900" : "text-slate-700"
                            )}>
                              {lesson.title}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {lesson.objectives.map((obj, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">
                                  {obj}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI & Style Config */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            {/* Reference Book Config */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Book className="h-24 w-24 text-blue-900" />
              </div>
              
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
                <Settings2 className="h-4 w-4" />
                Immersive Context
              </h3>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Reference Textbook</label>
                  <select 
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Default AI Style (Oxford Standard)</option>
                    {books.map(book => (
                      <option key={book._id} value={book._id}>
                        {book.title} ({book.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-bold text-blue-900">Style Engine</span>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Selecting a reference book will force the AI to mimic its tone, lesson structure, and terminology conventions.
                  </p>
                </div>
              </div>
            </div>

            {/* Generated Status */}
            {generatedEbookId && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 shadow-sm animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 leading-none">Draft Ready!</h4>
                    <span className="text-xs text-emerald-600">Generated successfully</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowPreviewModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-emerald-200 rounded-xl text-emerald-700 font-bold hover:bg-emerald-50 transition-all shadow-sm"
                  >
                    <Eye className="h-4 w-4" />
                    Preview Lessons
                  </button>
                  <button 
                    onClick={handleExport}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <Download className="h-4 w-4" />
                    Export to PDF
                  </button>

                  {downloadUrl && (
                    <div className="p-3 bg-emerald-100/50 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">File Ready</span>
                      <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                        Download <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Add Reference Textbook</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-6">
              <div className="space-y-4">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer",
                    selectedFile 
                      ? "border-emerald-400 bg-emerald-50 text-emerald-600" 
                      : "border-slate-200 bg-slate-50 text-slate-400 hover:border-blue-400 hover:bg-blue-50/50"
                  )}
                >
                  {selectedFile ? (
                    <>
                      <File className="h-8 w-8 mb-2 animate-bounce" />
                      <span className="text-sm font-bold truncate max-w-[200px]">{selectedFile.name}</span>
                      <span className="text-[10px] uppercase font-black tracking-widest mt-1">Ready for analysis</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mb-2 group-hover:text-blue-600" />
                      <span className="text-sm font-medium">Click to Select PDF</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-60">Max size 50MB</span>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Textbook Title</label>
                  <input 
                    required
                    type="text"
                    value={newBookTitle}
                    onChange={(e) => setNewBookTitle(e.target.value)}
                    placeholder="e.g. Oxford English for Hospitality"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={uploading || !newBookTitle}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20",
                  uploading || !newBookTitle
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                {uploading ? "Analyzing Styles..." : "Add to Library"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowPreviewModal(false)}
          />
          <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Ebook Preview</h3>
                  <p className="text-sm text-slate-500">
                    {isEditing ? "Editing Lesson Content..." : "Draft version generated with AI Reference Style"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                    isEditing 
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  )}
                >
                  {isEditing ? "Cancel" : "Edit Content"}
                </button>
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              {generatedLessons.length > 0 ? (
                generatedLessons.map((lesson, i) => (
                  <div key={i} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-black text-slate-100">0{lesson.lesson_number || i + 1}</span>
                      {isEditing ? (
                        <input 
                          value={lesson.title}
                          onChange={(e) => handleUpdateLesson(i, "title", e.target.value)}
                          className="flex-1 text-2xl font-bold text-slate-800 border-b-2 border-blue-500 bg-blue-50/50 px-2 py-1 rounded focus:outline-none"
                        />
                      ) : (
                        <h4 className="text-2xl font-bold text-slate-800 border-b-4 border-blue-100 pb-1">{lesson.title}</h4>
                      )}
                    </div>
                    <div className="prose prose-slate max-w-none">
                      {isEditing ? (
                        <textarea 
                          value={lesson.content}
                          onChange={(e) => handleUpdateLesson(i, "content", e.target.value)}
                          rows={6}
                          className="w-full bg-blue-50/30 rounded-2xl p-6 border-2 border-blue-200 text-slate-700 leading-relaxed font-serif text-lg shadow-inner focus:outline-none focus:border-blue-500 transition-all"
                        />
                      ) : (
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-slate-700 leading-relaxed font-serif text-lg italic shadow-inner">
                          "{lesson.content}"
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-2 bg-blue-100 rounded-full"></div>
                      <div className="h-2 bg-blue-100 rounded-full"></div>
                      <div className="h-2 bg-slate-100 rounded-full"></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <FileText className="h-12 w-12 mb-4 opacity-20" />
                  <p className="font-medium">No lesson content available for preview.</p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                AI Reference: {selectedBookId ? "Custom Style" : "Standard Academic"}
              </span>
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <button 
                    disabled={saving}
                    onClick={handleSaveChanges}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Save Changes
                  </button>
                ) : (
                  <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    <Download className="h-5 w-5" />
                    Finalize & Export
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
