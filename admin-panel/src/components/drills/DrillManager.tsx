import React, { useState, useRef } from "react"
import type { VideoDrill, VideoDrillPayload, VideoDrillStep } from "../../types/videoDrill"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, uploadAsset, getLessons, getGames, getAssets } from "../../services/api"
import { Plus, Pencil, Trash2, GripVertical, FileVideo, Video, Loader2, Upload, ImageIcon, Music, FolderOpen, Search, Film, X } from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"

interface DrillManagerProps {
  lessonId?: string
  topic?: string
}

export const DrillManager: React.FC<DrillManagerProps> = ({ lessonId, topic }) => {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [currentDrill, setCurrentDrill] = useState<Partial<VideoDrillPayload> | null>(null)
  const [uploading, setUploading] = useState<string | null>(null) // tracks which field is uploading

  // Media library picker states
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [libraryType, setLibraryType] = useState<'image' | 'video' | 'audio'>('image')
  const [libraryActiveTab, setLibraryActiveTab] = useState<'all' | 'image' | 'video' | 'audio'>('all')
  const [libraryTargetStepIndex, setLibraryTargetStepIndex] = useState<number | null>(null)
  const [libraryTargetField, setLibraryTargetField] = useState<'video_url' | 'image_url' | 'audio_url' | ''>('')
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

  const openLibraryPicker = (type: 'image' | 'video' | 'audio', stepIndex: number, field: 'video_url' | 'image_url' | 'audio_url') => {
    setLibraryType(type)
    setLibraryActiveTab(type) // Default tab to the requested type
    setLibraryTargetStepIndex(stepIndex)
    setLibraryTargetField(field)
    setLibrarySearchQuery('')
    setIsLibraryOpen(true)
    fetchLibraryAssets()
  }

  const handleSelectAsset = (url: string) => {
    if (libraryTargetStepIndex !== null && libraryTargetField) {
      updateStep(libraryTargetStepIndex, { [libraryTargetField]: url })
    }
    setIsLibraryOpen(false)
  }

  const handleFileUpload = async (
    file: File,
    stepIndex: number,
    field: "video_url" | "image_url" | "audio_url",
    fieldLabel: string
  ) => {
    setUploading(`${stepIndex}-${field}`)
    try {
      const url = await uploadAsset(file)
      updateStep(stepIndex, { [field]: url })
    } catch (e) {
      console.error(`Failed to upload ${fieldLabel}:`, e)
      alert(`Upload failed for ${fieldLabel}. Please try again.`)
    } finally {
      setUploading(null)
    }
  }

  // Fetch Drills
  const { data: drills, isLoading } = useQuery<VideoDrill[]>({
    queryKey: ["videoDrills", lessonId, topic],
    queryFn: async () => {
      let url = "/video-drills"
      const params = new URLSearchParams()
      if (lessonId) params.append("lesson_id", lessonId)
      if (topic) params.append("topic", topic)
      if (params.toString()) url += `?${params.toString()}`
      
      const res = await api.get(url)
      return res.data
    }
  })

  // Fetch lessons for topic extraction
  const { data: lessonsData } = useQuery({
    queryKey: ["lessons"],
    queryFn: getLessons,
  })

  // Extract unique topics from paginated lessons response
  const availableTopics = Array.from(
    new Set((lessonsData?.data || lessonsData || [])?.map((l: any) => l.topic).filter(Boolean) || [])
  )

  // Fetch games for selection
  const { data: gamesData } = useQuery({
    queryKey: ["games", lessonId],
    queryFn: () => getGames(lessonId),
  })
  const games = gamesData?.data || gamesData || []

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newDrill: VideoDrillPayload) => api.post("/video-drills", newDrill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videoDrills"] })
      setIsEditing(false)
      setCurrentDrill(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VideoDrillPayload }) =>
      api.put(`/video-drills/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videoDrills"] })
      setIsEditing(false)
      setCurrentDrill(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/video-drills/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["videoDrills"] }),
  })

  // Handlers
  const handleEdit = (drill: VideoDrill) => {
    // Keep the full drill to know if we're updating
    setCurrentDrill(drill as any)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!currentDrill?.title || !currentDrill?.topic) return

    const payload = currentDrill as VideoDrillPayload
    const drillId = (currentDrill as any)._id

    if (drillId) {
      const idStr = typeof drillId === "string" ? drillId : drillId.$oid
      updateMutation.mutate({ id: idStr, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const addStep = (type: "watch" | "pick_word" | "pick_sentence" | "fill_blank" | "play_game") => {
    if (!currentDrill) return
    const newStep: VideoDrillStep = {
      order: (currentDrill.steps?.length || 0) + 1,
      step_type: type,
      target_text: "",
      distractors: [],
      auto_distractors: true,
      blank_sentence: type === "fill_blank" ? "" : undefined,
      game_id: type === "play_game" ? undefined : undefined,
    }
    setCurrentDrill({
      ...currentDrill,
      steps: [...(currentDrill.steps || []), newStep],
    })
  }

  const updateStep = (index: number, updates: Partial<VideoDrillStep>) => {
    if (!currentDrill?.steps) return
    const newSteps = [...currentDrill.steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setCurrentDrill({ ...currentDrill, steps: newSteps })
  }

  const removeStep = (index: number) => {
    if (!currentDrill?.steps) return
    const newSteps = [...currentDrill.steps]
    newSteps.splice(index, 1)
    // Update order
    newSteps.forEach((s, i) => (s.order = i + 1))
    setCurrentDrill({ ...currentDrill, steps: newSteps })
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !currentDrill?.steps) return
    
    const items = Array.from(currentDrill.steps)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    
    items.forEach((s, i) => (s.order = i + 1))
    setCurrentDrill({ ...currentDrill, steps: items })
  }

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-500" />
            Video Drills
          </h2>
          <p className="text-sm text-slate-500">Manage interactive watch-and-pick drills</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              setCurrentDrill({
                title: "",
                topic: topic || "",
                level: "A1",
                lesson_id: lessonId,
                steps: [],
              })
              setIsEditing(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Drill
          </button>
        )}
      </div>

      <div className="p-6">
        {isEditing && currentDrill ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={currentDrill.title || ""}
                  onChange={(e) => setCurrentDrill({ ...currentDrill, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Checking into a hotel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                <input
                  type="text"
                  list="lesson-topics"
                  value={currentDrill.topic || ""}
                  onChange={(e) => setCurrentDrill({ ...currentDrill, topic: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Select or type a topic..."
                />
                <datalist id="lesson-topics">
                  {availableTopics.map((t: any) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                <select
                  value={currentDrill.level || "A1"}
                  onChange={(e) => setCurrentDrill({ ...currentDrill, level: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-medium text-slate-700">Drill Steps</h3>
                <div className="flex gap-2">
                  <button onClick={() => addStep("watch")} className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50">
                    + Watch
                  </button>
                  <button onClick={() => addStep("pick_word")} className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50">
                    + Pick Word
                  </button>
                  <button onClick={() => addStep("pick_sentence")} className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50">
                    + Pick Sentence
                  </button>
                  <button onClick={() => addStep("fill_blank")} className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50">
                    + Fill Blank
                  </button>
                  <button onClick={() => addStep("play_game")} className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50">
                    + Gamification
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50/50">
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="steps">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {currentDrill.steps?.map((step, index) => (
                          <Draggable key={`${index}-${step.step_type}`} draggableId={`step-${index}`} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex gap-4 items-start group"
                              >
                                <div {...provided.dragHandleProps} className="mt-2 text-slate-400 hover:text-slate-600">
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                <div className="flex-1 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 uppercase">
                                      {step.step_type.replace('_', ' ')}
                                    </span>
                                    <button
                                      onClick={() => removeStep(index)}
                                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    {step.step_type === "play_game" ? (
                                      <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Select Game</label>
                                        <select
                                          value={step.game_id || ""}
                                          onChange={(e) => updateStep(index, { game_id: e.target.value })}
                                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                                        >
                                          <option value="">-- Select a game --</option>
                                          {(games || []).map((g: any) => {
                                            const gId = typeof g._id === "string" ? g._id : g._id?.$oid
                                            return (
                                              <option key={gId} value={gId}>
                                                {g.game_type?.replace(/_/g, " ")}: {g.title} ({g.difficulty})
                                              </option>
                                            )
                                          })}
                                        </select>
                                      </div>
                                    ) : step.step_type === "fill_blank" ? (
                                      <>
                                        <div className="col-span-2">
                                          <label className="block text-xs font-medium text-slate-500 mb-1">Sentence with Blank (e.g., "What is your _____?")</label>
                                          <input
                                            type="text"
                                            value={step.blank_sentence || ""}
                                            onChange={(e) => updateStep(index, { blank_sentence: e.target.value })}
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                                            placeholder="What is your _____?"
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="block text-xs font-medium text-slate-500 mb-1">Correct Answer (to fill in the blank)</label>
                                          <input
                                            type="text"
                                            value={step.target_text}
                                            onChange={(e) => updateStep(index, { target_text: e.target.value })}
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                                            placeholder="e.g., name"
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Target Text / Question</label>
                                        <input
                                          type="text"
                                          value={step.target_text}
                                          onChange={(e) => updateStep(index, { target_text: e.target.value })}
                                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                                        />
                                      </div>
                                    )}
                                    
                                    {(step.step_type === "watch" || step.step_type === "pick_sentence" || step.step_type === "fill_blank" || step.step_type === "play_game") && (
                                      <div className="col-span-2 space-y-3">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Media Type</label>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => updateStep(index, { video_url: step.video_url || "", image_url: undefined })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!step.image_url ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
                                          >
                                            🎬 Video
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => updateStep(index, { image_url: step.image_url || "", video_url: undefined })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${step.image_url !== undefined ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
                                          >
                                            🖼️ Image + Audio
                                          </button>
                                        </div>

                                        {/* Video mode */}
                                        {step.image_url === undefined && (
                                          <div className="space-y-2">
                                            <div className="flex gap-2 items-center">
                                              <div className="relative flex-1">
                                                <FileVideo className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
                                                <input
                                                  type="text"
                                                  value={step.video_url || ""}
                                                  onChange={(e) => updateStep(index, { video_url: e.target.value })}
                                                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md"
                                                  placeholder="Video URL or upload →"
                                                />
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => openLibraryPicker('video', index, 'video_url')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-bold transition-all border border-slate-200"
                                              >
                                                <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                                                Library
                                              </button>
                                              <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all ${uploading === `${index}-video_url` ? "bg-slate-200 text-slate-400" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}>
                                                {uploading === `${index}-video_url` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                Upload
                                                <input
                                                  type="file"
                                                  accept="video/*"
                                                  className="hidden"
                                                  disabled={uploading !== null}
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleFileUpload(file, index, "video_url", "video")
                                                    e.target.value = ""
                                                  }}
                                                />
                                              </label>
                                            </div>
                                            {step.video_url && (
                                              <p className="text-[10px] text-green-600 font-medium truncate">✓ {step.video_url}</p>
                                            )}
                                          </div>
                                        )}

                                        {/* Image + Audio mode */}
                                        {step.image_url !== undefined && (
                                          <div className="grid grid-cols-2 gap-3">
                                            {/* Image upload */}
                                            <div className="space-y-2">
                                              <label className="block text-xs font-medium text-slate-500">Image</label>
                                              <div className="flex gap-2 items-center">
                                                <div className="relative flex-1">
                                                  <ImageIcon className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
                                                  <input
                                                    type="text"
                                                    value={step.image_url || ""}
                                                    onChange={(e) => updateStep(index, { image_url: e.target.value })}
                                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md"
                                                    placeholder="URL or upload →"
                                                  />
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => openLibraryPicker('image', index, 'image_url')}
                                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-bold transition-all border border-slate-200"
                                                >
                                                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                                                  Library
                                                </button>
                                                <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all ${uploading === `${index}-image_url` ? "bg-slate-200 text-slate-400" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                                                  {uploading === `${index}-image_url` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                  <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    disabled={uploading !== null}
                                                    onChange={(e) => {
                                                      const file = e.target.files?.[0]
                                                      if (file) handleFileUpload(file, index, "image_url", "image")
                                                      e.target.value = ""
                                                    }}
                                                  />
                                                </label>
                                              </div>
                                              {step.image_url && (
                                                <p className="text-[10px] text-green-600 font-medium truncate">✓ {step.image_url}</p>
                                              )}
                                            </div>
                                            {/* Audio upload */}
                                            <div className="space-y-2">
                                              <label className="block text-xs font-medium text-slate-500">Audio</label>
                                              <div className="flex gap-2 items-center">
                                                <div className="relative flex-1">
                                                  <Music className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
                                                  <input
                                                    type="text"
                                                    value={step.audio_url || ""}
                                                    onChange={(e) => updateStep(index, { audio_url: e.target.value })}
                                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md"
                                                    placeholder="URL or upload →"
                                                  />
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => openLibraryPicker('audio', index, 'audio_url')}
                                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-bold transition-all border border-slate-200"
                                                >
                                                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                                                  Library
                                                </button>
                                                <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all ${uploading === `${index}-audio_url` ? "bg-slate-200 text-slate-400" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}>
                                                  {uploading === `${index}-audio_url` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                  <input
                                                    type="file"
                                                    accept="audio/*"
                                                    className="hidden"
                                                    disabled={uploading !== null}
                                                    onChange={(e) => {
                                                      const file = e.target.files?.[0]
                                                      if (file) handleFileUpload(file, index, "audio_url", "audio")
                                                      e.target.value = ""
                                                    }}
                                                  />
                                                </label>
                                              </div>
                                              {step.audio_url && (
                                                <p className="text-[10px] text-green-600 font-medium truncate">✓ {step.audio_url}</p>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {(step.step_type.startsWith("pick_") || step.step_type === "fill_blank") && (
                                      <div className="col-span-2">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                                          <input
                                            type="checkbox"
                                            checked={step.auto_distractors}
                                            onChange={(e) => updateStep(index, { auto_distractors: e.target.checked })}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                          />
                                          Auto-generate distractors from topic
                                        </label>
                                        {!step.auto_distractors && (
                                          <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Manual Distractors (comma separated)</label>
                                            <input
                                              type="text"
                                              value={step.distractors.join(", ")}
                                              onChange={(e) => updateStep(index, { distractors: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                                              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {currentDrill.steps?.length === 0 && (
                          <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-slate-300 rounded-lg">
                            No steps added yet. Add a Watch or Pick step to start.
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setCurrentDrill(null)
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Drill
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drills?.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-900">No drills found</h3>
                <p className="text-sm text-slate-500 mt-1">Create a new video drill to get started.</p>
              </div>
            ) : (
              drills?.map((drill) => {
                const id = typeof drill._id === "string" ? drill._id : drill._id?.$oid;
                return (
                  <div key={id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-slate-900 leading-tight">{drill.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium">
                            {drill.level}
                          </span>
                          <span className="text-xs text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">
                            {drill.topic}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(drill)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this drill?")) {
                              deleteMutation.mutate(id!)
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                      <span>{drill.steps.length} steps</span>
                      <div className="flex gap-1">
                        {drill.steps.slice(0, 5).map((s, i) => (
                          <div 
                            key={i} 
                            className={`w-2 h-2 rounded-full ${s.step_type === 'watch' ? 'bg-blue-400' : 'bg-green-400'}`}
                            title={s.step_type}
                          />
                        ))}
                        {drill.steps.length > 5 && <span className="text-[10px] ml-1">+{drill.steps.length - 5}</span>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
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
