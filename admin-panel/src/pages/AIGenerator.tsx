import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Sparkles, Loader2, Save, RefreshCw, ChevronDown, ChevronRight,
  BookOpen, Layers, MessageSquare, HelpCircle, Gamepad2, Languages,
  Check, AlertTriangle
} from "lucide-react"
import { generateCourse, saveCourse } from "../services/api"
import { cn } from "../lib/utils"

type TabKey = "course" | "modules" | "vocabulary" | "games"

export default function AIGenerator() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>("course")
  const [preview, setPreview] = useState<any>(null)
  const [formData, setFormData] = useState({
    topic: "",
    level: "a1",
    category: "hotel",
    skill_focus: ["speaking", "listening"],
    target_age: "adults",
    num_modules: 2,
    lessons_per_module: 2,
    vocab_per_lesson: 4,
  })

  const generateMutation = useMutation({
    mutationFn: generateCourse,
    onSuccess: (data) => {
      setPreview(data)
      setActiveTab("course")
    },
    onError: (err: any) => {
      const msg = typeof err?.response?.data === "string"
        ? err.response.data
        : (err?.response?.data?.message || err.message || "Unknown error")
      alert(`Generation failed: ${msg}`)
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => saveCourse(preview),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] })
      alert(`Course saved! ${data.stats.modules} modules, ${data.stats.lessons} lessons, ${data.stats.vocabulary} vocab, ${data.stats.games} games created.`)
      setPreview(null)
    },
    onError: (err: any) => {
      const msg = typeof err?.response?.data === "string"
        ? err.response.data
        : (err?.response?.data?.message || err.message || "Unknown error")
      alert(`Save failed: ${msg}`)
    },
  })

  const handleGenerate = () => {
    if (!formData.topic.trim()) {
      alert("Please enter a topic")
      return
    }
    generateMutation.mutate(formData)
  }

  const skillOptions = ["speaking", "listening", "reading", "writing", "grammar", "vocabulary", "pronunciation"]
  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skill_focus: prev.skill_focus.includes(skill)
        ? prev.skill_focus.filter(s => s !== skill)
        : [...prev.skill_focus, skill],
    }))
  }

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "course", label: "Course", icon: BookOpen },
    { key: "modules", label: "Modules & Lessons", icon: Layers },
    { key: "vocabulary", label: "Vocabulary", icon: Languages },
    { key: "games", label: "Games", icon: Gamepad2 },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-500" />
            AI Course Generator
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Generate a complete course with modules, lessons, vocabulary, quizzes, and games.
          </p>
        </div>
      </div>

      {/* Generator Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Course Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Topic */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Topic *</label>
            <input
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 transition-all"
              value={formData.topic}
              onChange={e => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g. Hotel Front Desk, Restaurant Service, Cruise Ship Hospitality..."
            />
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">CEFR Level</label>
            <select
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
              value={formData.level}
              onChange={e => setFormData({ ...formData, level: e.target.value })}
            >
              {["a1", "a2", "b1", "b2", "c1", "c2"].map(l => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              {["hotel", "restaurant", "cruise", "interview", "general", "business", "travel"].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Target Age */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Age</label>
            <select
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
              value={formData.target_age}
              onChange={e => setFormData({ ...formData, target_age: e.target.value })}
            >
              {["kids", "teens", "adults", "all"].map(a => (
                <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Modules count */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Modules</label>
            <input
              type="number"
              min={1}
              max={5}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              value={formData.num_modules}
              onChange={e => setFormData({ ...formData, num_modules: parseInt(e.target.value) || 2 })}
            />
          </div>

          {/* Lessons per module */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Lessons per Module</label>
            <input
              type="number"
              min={1}
              max={5}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              value={formData.lessons_per_module}
              onChange={e => setFormData({ ...formData, lessons_per_module: parseInt(e.target.value) || 2 })}
            />
          </div>

          {/* Vocab per lesson */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vocabulary per Lesson</label>
            <input
              type="number"
              min={2}
              max={10}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              value={formData.vocab_per_lesson}
              onChange={e => setFormData({ ...formData, vocab_per_lesson: parseInt(e.target.value) || 4 })}
            />
          </div>

          {/* Skill Focus */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">Skill Focus</label>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize",
                    formData.skill_focus.includes(skill)
                      ? "bg-violet-50 border-violet-300 text-violet-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  )}
                >
                  {formData.skill_focus.includes(skill) && <Check className="inline h-3 w-3 mr-1" />}
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !formData.topic.trim()}
            className="flex items-center px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-sm shadow-violet-600/20 hover:shadow-violet-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating... (this may take 30-60s)
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Course
              </>
            )}
          </button>
          {preview && (
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="flex items-center px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          {/* Tab Bar */}
          <div className="flex items-center justify-between">
            <div className="flex bg-slate-100/50 p-1 rounded-xl">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                    activeTab === tab.key
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <tab.icon className="mr-1.5 h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save to Database
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            {activeTab === "course" && <CoursePreview course={preview.course} />}
            {activeTab === "modules" && <ModulesPreview modules={preview.modules} />}
            {activeTab === "vocabulary" && <VocabularyPreview modules={preview.modules} />}
            {activeTab === "games" && <GamesPreview modules={preview.modules} />}
          </div>
        </div>
      )}
    </div>
  )
}

// =============== Preview Sub-Components ===============

function CoursePreview({ course }: { course: any }) {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard label="Title (EN)" value={course.title} />
        <InfoCard label="Title (ID)" value={course.title_id} />
        <InfoCard label="Description (EN)" value={course.description} full />
        <InfoCard label="Description (ID)" value={course.description_id} full />
        <InfoCard label="Category" value={course.category} badge />
        <InfoCard label="Level" value={course.level?.toUpperCase()} badge />
        <InfoCard label="Target Age" value={course.target_age} badge />
        <InfoCard label="Duration" value={course.estimated_duration} />
      </div>
      {course.skill_focus?.length > 0 && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Skill Focus</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {course.skill_focus.map((s: string) => (
              <span key={s} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-lg capitalize">{s}</span>
            ))}
          </div>
        </div>
      )}
      {course.tags?.length > 0 && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tags</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {course.tags.map((t: string) => (
              <span key={t} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ModulesPreview({ modules }: { modules: any[] }) {
  const [expandedModule, setExpandedModule] = useState<number | null>(0)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  return (
    <div className="divide-y divide-slate-100">
      {modules.map((mod, mi) => (
        <div key={mi}>
          <button
            onClick={() => setExpandedModule(expandedModule === mi ? null : mi)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                {mi + 1}
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800 text-sm">{mod.title}</p>
                <p className="text-xs text-slate-500">{mod.title_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{mod.lessons?.length || 0} lessons</span>
              {expandedModule === mi ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </div>
          </button>

          {expandedModule === mi && (
            <div className="px-6 pb-4 space-y-3">
              <p className="text-sm text-slate-600">{mod.description}</p>
              <p className="text-sm text-slate-500 italic">{mod.description_id}</p>

              {mod.lessons?.map((lesson: any, li: number) => {
                const lessonKey = `${mi}-${li}`
                return (
                  <div key={li} className="bg-slate-50 rounded-xl border border-slate-100">
                    <button
                      onClick={() => setExpandedLesson(expandedLesson === lessonKey ? null : lessonKey)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100/50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm text-slate-700">{lesson.title}</span>
                        <span className="text-xs text-amber-600 font-medium">{lesson.xp_reward} XP</span>
                      </div>
                      {expandedLesson === lessonKey ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </button>

                    {expandedLesson === lessonKey && (
                      <div className="px-4 pb-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs font-medium text-slate-500">Title (ID)</span>
                            <p className="text-sm text-slate-600 mt-0.5">{lesson.title_id}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-500">Culture Notes</span>
                            <p className="text-sm text-slate-600 mt-0.5">{lesson.culture_notes || "—"}</p>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-medium text-slate-500">Content (EN)</span>
                          <div className="mt-1 p-3 bg-white rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {lesson.content}
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-medium text-slate-500">Instruction</span>
                          <p className="text-sm text-slate-600 mt-0.5">{lesson.instruction}</p>
                          <p className="text-sm text-slate-500 italic mt-0.5">{lesson.instruction_id}</p>
                        </div>

                        {/* Dialogue */}
                        <div>
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Dialogue: {lesson.dialogue?.title}
                          </span>
                          <p className="text-xs text-slate-400 italic">{lesson.dialogue?.context}</p>
                          <div className="mt-2 space-y-1.5">
                            {lesson.dialogue?.lines?.map((line: any, idx: number) => (
                              <div key={idx} className="flex gap-2 text-sm">
                                <span className="font-medium text-blue-600 min-w-[80px]">{line.speaker}:</span>
                                <div>
                                  <span className="text-slate-700">{line.text_en}</span>
                                  <span className="text-slate-400 ml-2 text-xs">({line.text_id})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Quiz */}
                        <div>
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <HelpCircle className="h-3 w-3" /> Quiz: {lesson.quiz?.title} — {lesson.quiz?.xp_reward} XP
                          </span>
                          <div className="mt-2 space-y-2">
                            {lesson.quiz?.questions?.map((q: any, qi: number) => (
                              <div key={qi} className="text-sm p-2 bg-white rounded-lg border border-slate-200">
                                <p className="font-medium text-slate-700">Q{qi + 1}: {q.question}</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {q.options?.map((opt: string, oi: number) => (
                                    <span
                                      key={oi}
                                      className={cn(
                                        "px-2 py-0.5 text-xs rounded-md",
                                        oi === q.correct_answer
                                          ? "bg-emerald-50 text-emerald-700 font-medium"
                                          : "bg-slate-50 text-slate-500"
                                      )}
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function VocabularyPreview({ modules }: { modules: any[] }) {
  return (
    <div className="p-6">
      {modules.map((mod, mi) => (
        <div key={mi} className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            Module {mi + 1}: {mod.title}
          </h4>
          {mod.lessons?.map((lesson: any, li: number) => (
            <div key={li} className="mb-4">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Lesson {li + 1}: {lesson.title}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Word</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Translation</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Pronunciation</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Example (EN)</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Example (ID)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lesson.vocabulary?.map((v: any, vi: number) => (
                      <tr key={vi} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-medium text-slate-800">{v.word}</td>
                        <td className="py-2 px-3 text-slate-600">{v.translation}</td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-xs">{v.pronunciation}</td>
                        <td className="py-2 px-3 text-slate-600">{v.example_en}</td>
                        <td className="py-2 px-3 text-slate-500 italic">{v.example_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function GamesPreview({ modules }: { modules: any[] }) {
  const gameTypeColors: Record<string, string> = {
    SCENE_MATCHER: "bg-blue-50 text-blue-700",
    WORD_SCRAMBLE: "bg-amber-50 text-amber-700",
    MATCHING: "bg-emerald-50 text-emerald-700",
    FILL_IN_THE_BLANK: "bg-pink-50 text-pink-700",
    RESPECT_MASTER: "bg-violet-50 text-violet-700",
    VOICE_STAR: "bg-orange-50 text-orange-700",
  }

  return (
    <div className="p-6 space-y-6">
      {modules.map((mod, mi) => (
        <div key={mi}>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            Module {mi + 1}: {mod.title}
          </h4>
          {mod.lessons?.map((lesson: any, li: number) => (
            <div key={li} className="mb-4">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Lesson {li + 1}: {lesson.title}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {lesson.games?.map((game: any, gi: number) => (
                  <div key={gi} className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold uppercase rounded tracking-wider",
                        gameTypeColors[game.game_type] || "bg-slate-100 text-slate-600"
                      )}>
                        {game.game_type?.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-amber-600 font-medium">{game.xp_reward} XP</span>
                    </div>
                    <p className="font-medium text-sm text-slate-800">{game.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{game.instructions}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-medium rounded capitalize",
                        game.difficulty === "easy" ? "bg-emerald-50 text-emerald-600" :
                        game.difficulty === "medium" ? "bg-amber-50 text-amber-600" :
                        "bg-red-50 text-red-600"
                      )}>
                        {game.difficulty}
                      </span>
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">data_json</summary>
                      <pre className="mt-1 text-xs text-slate-500 bg-white rounded-lg p-2 border border-slate-200 overflow-x-auto max-h-32">
                        {JSON.stringify(game.data_json, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function InfoCard({ label, value, badge, full }: { label: string; value: string; badge?: boolean; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      {badge ? (
        <div className="mt-1">
          <span className="inline-flex px-2.5 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg capitalize">{value}</span>
        </div>
      ) : (
        <p className="text-sm text-slate-700 mt-1">{value}</p>
      )}
    </div>
  )
}
