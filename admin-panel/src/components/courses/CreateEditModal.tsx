import { X, Loader2, Sparkles, Globe, History, Upload, Image as ImageIcon, Film, Music, FolderOpen, Search } from "lucide-react"
import { cn } from "../../lib/utils"
import { uploadAsset, generateLessonObjective, getAssets } from "../../services/api"
import { useState, useRef, useCallback } from "react"

export default function CreateEditModal({
  isModalOpen,
  activeTab,
  editingId,
  setHistoryEntityId,
  setIsHistoryModalOpen,
  handleAIHelper,
  isGeneratingAI,
  closeModal,
  formData,
  setFormData,
  handleTranslateField,
  translatingField,
  handleSubmit,
  createMutation,
  updateMutation,
  courses,
  modules
}: any) {
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isGeneratingObjective, setIsGeneratingObjective] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Media library picker states
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [libraryType, setLibraryType] = useState<'image' | 'video' | 'audio'>('image')
  const [libraryActiveTab, setLibraryActiveTab] = useState<'all' | 'image' | 'video' | 'audio'>('all')
  const [libraryTargetField, setLibraryTargetField] = useState<string>('')
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')
  const [libraryAssets, setLibraryAssets] = useState<any[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)

  // Fetch library assets
  const fetchLibraryAssets = async () => {
    try {
      setIsLoadingLibrary(true)
      const data = await getAssets()
      setLibraryAssets(data || [])
    } catch (err) {
      console.error("Failed to fetch library assets:", err)
    } finally {
      setIsLoadingLibrary(false)
    }
  }

  const openLibraryPicker = (type: 'image' | 'video' | 'audio', field: string) => {
    setLibraryType(type)
    setLibraryActiveTab(type) // Default tab to the requested type
    setLibraryTargetField(field)
    setLibrarySearchQuery('')
    setIsLibraryOpen(true)
    fetchLibraryAssets()
  }

  const handleSelectAsset = (url: string) => {
    setFormData((prev: any) => ({ ...prev, [libraryTargetField]: url }))
    setIsLibraryOpen(false)
  }

  if (!isModalOpen) return null;

  const handleGenerateObjective = async () => {
    if (!formData.title || !formData.content) {
      alert("Please fill in the English title and English content first to generate an objective.");
      return;
    }
    try {
      setIsGeneratingObjective(true);
      const res = await generateLessonObjective({
        lesson_title: formData.title,
        lesson_content: formData.content,
      });
      if (res.objective) {
        setFormData((prev: any) => ({ ...prev, objective: res.objective, objective_id: res.objective_id }));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate objective. Please check your AI API key.");
    } finally {
      setIsGeneratingObjective(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const data = await uploadAsset(file)
      setFormData({ ...formData, cover_image_url: data.url })
    } catch (err) {
      console.error("Upload failed:", err)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800">
            {editingId ? 'Edit' : 'Create'} {activeTab.slice(0, -1).replace(/^\w/, (c: string) => c.toUpperCase())}
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
          {/* AI Custom Context Helper */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
            <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              AI Custom Context (Optional)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all bg-white min-h-[60px]"
              value={formData.ai_override_prompt || ''}
              onChange={e => setFormData({ ...formData, ai_override_prompt: e.target.value })}
              placeholder="Give specific instructions to the AI (e.g., 'Focus on front-desk vocabulary' or 'Use a formal business tone'). This context is only for generation and won't be saved."
            />
          </div>

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

          {/* ====== Image Thumbnail (Courses Only) ====== */}
          {activeTab === 'courses' && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between items-center">
                  <span>Cover Image</span>
                  <span className="text-[10px] text-slate-400 font-normal">URL or Upload</span>
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all bg-white"
                    value={formData.cover_image_url || ''}
                    onChange={e => setFormData({ ...formData, cover_image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*"
                  />
                  <button
                    type="button"
                    onClick={triggerUpload}
                    disabled={isUploading}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => openLibraryPicker('image', 'cover_image_url')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border border-slate-200"
                  >
                    <FolderOpen className="h-4 w-4 text-blue-500" />
                    Library
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Recommended: 16:9 aspect ratio. You can paste a URL or upload a local file.</p>
              </div>
              <div className="w-full md:w-48 h-28 bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 group relative">
                {formData.cover_image_url ? (
                  <>
                    <img src={formData.cover_image_url} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => setFormData({ ...formData, cover_image_url: '' })}
                        className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">No Preview</p>
                  </div>
                )}
              </div>
            </div>
          )}

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

              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">🎯 Learning Objective</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTranslateField('objective', 'objective_id')}
                      disabled={translatingField === 'objective_id' || !formData.objective?.trim()}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 font-bold uppercase tracking-wider"
                    >
                      Translate
                    </button>
                    <button
                      onClick={handleGenerateObjective}
                      disabled={isGeneratingObjective || !formData.title || !formData.content}
                      className="flex items-center gap-1.5 px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Generate learning objective using AI"
                    >
                      {isGeneratingObjective ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Generate
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>🇬🇧 English</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[60px] bg-white"
                    value={formData.objective || ''}
                    onChange={e => setFormData({ ...formData, objective: e.target.value })}
                    placeholder="e.g. Master the vocabulary for checking in guests..."
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>🇮🇩 Tujuan Belajar</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[60px] bg-white"
                    value={formData.objective_id || ''}
                    onChange={e => setFormData({ ...formData, objective_id: e.target.value })}
                    placeholder="e.g. Menguasai kosakata untuk melakukan check-in tamu..."
                  />
                </div>
                
                <p className="text-[10px] text-slate-400 mt-1">This objective will be shown as a phase in the student session player.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Lesson Audio</label>
                  {formData.audio_url ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden bg-slate-100 p-4 border border-slate-200">
                        <audio
                          src={formData.audio_url}
                          controls
                          className="w-full"
                          preload="metadata"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500 bg-slate-50 truncate"
                          value={formData.audio_url}
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, audio_url: '' })}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={formData.audio_url || ''}
                        onChange={e => setFormData({ ...formData, audio_url: e.target.value })}
                        placeholder="Paste URL or upload below..."
                      />
                      <input
                        type="file"
                        ref={audioInputRef}
                        accept="audio/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setIsUploadingAudio(true)
                          try {
                            const data = await uploadAsset(file)
                            setFormData({ ...formData, audio_url: data.url })
                          } catch (err) {
                            console.error('Audio upload failed:', err)
                            alert('Failed to upload audio.')
                          } finally {
                            setIsUploadingAudio(false)
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => audioInputRef.current?.click()}
                          disabled={isUploadingAudio}
                          className="flex-1 py-3 border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl text-sm font-medium text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isUploadingAudio ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                          ) : (
                            <><Music className="h-4 w-4" /> Upload Audio File</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openLibraryPicker('audio', 'audio_url')}
                          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border border-slate-200"
                        >
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                          Library
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Lesson Video</label>
                  {formData.video_url ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video max-h-36">
                        <video
                          src={formData.video_url}
                          controls
                          className="w-full h-full object-contain"
                          preload="metadata"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500 bg-slate-50 truncate"
                          value={formData.video_url}
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, video_url: '' })}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={formData.video_url || ''}
                        onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                        placeholder="Paste URL or upload below..."
                      />
                      <input
                        type="file"
                        ref={videoInputRef}
                        accept="video/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 200 * 1024 * 1024) {
                            alert('Video must be under 200MB')
                            return
                          }
                          setIsUploadingVideo(true)
                          try {
                            const data = await uploadAsset(file)
                            setFormData({ ...formData, video_url: data.url })
                          } catch (err) {
                            console.error('Video upload failed:', err)
                            alert('Failed to upload video.')
                          } finally {
                            setIsUploadingVideo(false)
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={isUploadingVideo}
                          className="flex-1 py-3 border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl text-sm font-medium text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isUploadingVideo ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading video...</>
                          ) : (
                            <><Film className="h-4 w-4" /> Upload Video File</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openLibraryPicker('video', 'video_url')}
                          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border border-slate-200"
                        >
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                          Library
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">MP4, WebM, MOV • Max 200MB</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Lesson Image</label>
                  {formData.image_url ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-video max-h-36 flex items-center justify-center border border-slate-200">
                        <img
                          src={formData.image_url}
                          alt="Lesson"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500 bg-slate-50 truncate"
                          value={formData.image_url}
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={formData.image_url || ''}
                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="Paste URL or upload below..."
                      />
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setIsUploadingImage(true)
                          try {
                            const data = await uploadAsset(file)
                            setFormData({ ...formData, image_url: data.url })
                          } catch (err) {
                            console.error('Image upload failed:', err)
                            alert('Failed to upload image.')
                          } finally {
                            setIsUploadingImage(false)
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="flex-1 py-3 border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl text-sm font-medium text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isUploadingImage ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                          ) : (
                            <><ImageIcon className="h-4 w-4" /> Upload Image File</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openLibraryPicker('image', 'image_url')}
                          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border border-slate-200"
                        >
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                          Library
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">XP Reward</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.xp_reward || 0}
                    onChange={e => setFormData({ ...formData, xp_reward: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom AI Context (Optional Override)</label>
                  <textarea
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.ai_override_prompt || ''}
                    onChange={e => setFormData({ ...formData, ai_override_prompt: e.target.value })}
                    placeholder="Custom instructions for AI generation..."
                  />
                </div>
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

      {/* Nested Media Library Modal */}
      {isLibraryOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h4 className="text-lg font-bold text-slate-800 capitalize flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                  Select {libraryType} from Library
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Pick an asset previously uploaded in the Media Gallery</p>
              </div>
              <button 
                onClick={() => setIsLibraryOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search & Tabs Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/20 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all bg-white"
                  value={librarySearchQuery}
                  onChange={e => setLibrarySearchQuery(e.target.value)}
                  placeholder={`Search by filename...`}
                />
              </div>
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl max-w-xs">
                {(['all', 'image', 'video', 'audio'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setLibraryActiveTab(tab)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium capitalize transition-all ${
                      libraryActiveTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Content list */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              {isLoadingLibrary ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium">Loading library items...</p>
                </div>
              ) : (
                (() => {
                  const filtered = libraryAssets.filter(
                    (asset: any) =>
                      (libraryActiveTab === 'all' ? true : asset.asset_type === libraryActiveTab) &&
                      asset.filename.toLowerCase().includes(librarySearchQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-20 border border-slate-200 border-dashed rounded-2xl bg-white p-8">
                        <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-700">No assets found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {librarySearchQuery ? "Try a different search query" : `Upload some assets in the Media Gallery first`}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filtered.map((asset: any) => {
                        const id = asset._id?.$oid || asset.id;
                        return (
                          <div
                            key={id}
                            onClick={() => handleSelectAsset(asset.public_url)}
                            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-500 transition-all duration-200 cursor-pointer flex flex-col group"
                          >
                            {/* Media Preview inside selector */}
                            <div className="aspect-video bg-slate-100 relative flex items-center justify-center overflow-hidden border-b border-slate-100">
                              {asset.asset_type === 'image' && (
                                <img src={asset.public_url} alt={asset.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                              )}
                              {asset.asset_type === 'video' && (
                                <div className="relative w-full h-full flex items-center justify-center text-slate-400">
                                  <Film className="h-8 w-8 text-blue-500 z-10" />
                                  <video src={asset.public_url} className="absolute inset-0 w-full h-full object-cover opacity-50" muted playsInline />
                                </div>
                              )}
                              {asset.asset_type === 'audio' && (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <Music className="h-8 w-8 text-indigo-500" />
                                </div>
                              )}
                              {asset.asset_type !== 'image' && asset.asset_type !== 'video' && asset.asset_type !== 'audio' && (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <FolderOpen className="h-8 w-8 text-slate-500" />
                                </div>
                              )}
                            </div>
                            {/* Text info */}
                            <div className="p-3 flex-1 flex flex-col justify-between">
                              <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed" title={asset.filename}>
                                {asset.filename}
                              </p>
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded self-start mt-2 uppercase tracking-wide">
                                {asset.asset_type}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
