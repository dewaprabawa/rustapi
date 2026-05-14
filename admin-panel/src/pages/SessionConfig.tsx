import { useState, useEffect } from "react"
import {
  getLevelTemplates,
  updateLevelTemplate,
  getLessonConfigs,
  upsertLessonConfig,
  deleteLessonConfig,
  getLessons,
  updateLesson,
  getVocabulary,
  updateVocabulary,
} from "../services/api"

// Sub-components
import { SessionConfigHeader } from "../components/session/SessionConfigHeader"
import { TemplateList } from "../components/session/TemplateList"
import { OverrideList } from "../components/session/OverrideList"
import { TemplateModal } from "../components/session/TemplateModal"
import { ConfigModal } from "../components/session/ConfigModal"

export default function SessionConfig() {
  const [tab, setTab] = useState<"templates" | "overrides">("templates")
  const [templates, setTemplates] = useState<any[]>([])
  const [configs, setConfigs] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editTemplate, setEditTemplate] = useState<any | null>(null)
  const [editConfig, setEditConfig] = useState<any | null>(null)
  const [activeVocab, setActiveVocab] = useState<any[]>([])
  const [toast, setToast] = useState("")

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (editConfig?.lesson_id) {
      loadVocab(editConfig.lesson_id)
    } else {
      setActiveVocab([])
    }
  }, [editConfig?.lesson_id])

  const loadVocab = async (lessonId: string) => {
    try {
      const v = await getVocabulary(lessonId)
      setActiveVocab(Array.isArray(v) ? v : [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [t, c, l] = await Promise.all([getLevelTemplates(), getLessonConfigs(), getLessons()])
      setTemplates(Array.isArray(t) ? t : [])
      setConfigs(Array.isArray(c) ? c : [])
      setLessons(l && l.data ? l.data : (Array.isArray(l) ? l : []))
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  const saveTemplate = async () => {
    if (!editTemplate) return
    setSaving(true)
    try {
      await updateLevelTemplate(editTemplate.level, editTemplate)
      showToast(`✅ ${editTemplate.level} template saved`)
      setEditTemplate(null)
      loadAll()
    } catch (e) {
      showToast("❌ Failed to save template")
    }
    setSaving(false)
  }

  const saveConfig = async () => {
    if (!editConfig) return
    setSaving(true)
    try {
      await upsertLessonConfig(editConfig.lesson_id, editConfig)
      const lesson = lessons.find(l => (l._id?.$oid || l._id) === editConfig.lesson_id);
      if (lesson && lesson._dirty) {
        const { _dirty, ...lessonData } = lesson;
        await updateLesson(lesson._id?.$oid || lesson._id, lessonData);
      }
      const dirtyVocab = activeVocab.filter(v => v._dirty);
      for (const v of dirtyVocab) {
        const { _dirty, ...vData } = v;
        await updateVocabulary(v._id?.$oid || v._id, vData);
      }
      showToast("✅ All changes saved")
      setEditConfig(null)
      loadAll()
    } catch (e) {
      showToast("❌ Failed to save configuration")
    }
    setSaving(false)
  }

  const removeConfig = async (lessonId: string) => {
    if (!window.confirm("Remove override and revert to level template?")) return
    try {
      await deleteLessonConfig(lessonId)
      showToast("✅ Override removed")
      loadAll()
    } catch (e) {
      showToast("❌ Failed to remove override")
    }
  }

  const getLessonTitle = (id: string) => {
    const l = lessons.find((l) => (l._id?.$oid || l._id) === id)
    return l ? `${l.level} - ${l.title}` : "Unknown Lesson"
  }

  const handleLessonUpdate = (updatedLesson: any) => {
    setLessons(prev => prev.map(l => (l._id?.$oid || l._id) === updatedLesson._id?.$oid || (l._id === updatedLesson._id) ? updatedLesson : l))
  }

  const handleVocabUpdate = (updatedVocab: any) => {
    setActiveVocab(prev => prev.map(v => (v._id?.$oid || v._id) === (updatedVocab._id?.$oid || updatedVocab._id) ? updatedVocab : v))
  }

  const handleOverrideUpdate = (field: string, value: any) => {
    if (!editConfig) return
    setEditConfig({ ...editConfig, [field]: value })
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-500 pb-20">
      <SessionConfigHeader tab={tab} setTab={setTab} />

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Synchronizing architecture…</p>
        </div>
      ) : (
        <>
          {tab === "templates" && !editTemplate && (
            <TemplateList 
              templates={templates}
              onEdit={setEditTemplate}
            />
          )}

          {tab === "templates" && editTemplate && (
            <TemplateModal 
              editTemplate={editTemplate}
              setEditTemplate={setEditTemplate}
              onSave={saveTemplate}
              saving={saving}
            />
          )}

          {tab === "overrides" && !editConfig && (
            <div className="space-y-4">
              <button
                onClick={() => setEditConfig({
                  lesson_id: "", phases: null, override_lives: null, override_xp_multiplier: null,
                  pronunciation_sentences: null, conversation_prompt: null, branching_tree: null,
                })}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                + New Override
              </button>

              <OverrideList 
                configs={configs}
                onEdit={setEditConfig}
                onRemove={removeConfig}
                getLessonTitle={getLessonTitle}
              />
            </div>
          )}

          {tab === "overrides" && editConfig && (
            <ConfigModal 
              editConfig={editConfig}
              setEditConfig={setEditConfig}
              lessons={lessons}
              templates={templates}
              onSave={saveConfig}
              saving={saving}
              activeVocab={activeVocab}
              onLessonUpdate={handleLessonUpdate}
              onVocabUpdate={handleVocabUpdate}
              onOverrideUpdate={handleOverrideUpdate}
            />
          )}
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3">
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}
    </div>
  )
}
