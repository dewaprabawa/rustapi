import { useState, useEffect } from "react"
import {
  getLevelTemplates,
  updateLevelTemplate,
  getLessonConfigs,
  upsertLessonConfig,
  deleteLessonConfig,
  getLessons,
} from "../services/api"

// ── Types ──

interface PhaseSettings {
  difficulty?: string
  auto_play_audio?: boolean
  show_translation?: boolean
  drill_types?: string[]
  max_drill_count?: number
  sentence_count?: number
  min_accuracy_score?: number
  speed?: string
  turn_count?: number
}

interface PhaseConfig {
  phase_type: string
  enabled: boolean
  order: number
  settings: PhaseSettings
}

interface LevelTemplate {
  _id?: { $oid: string }
  level: string
  name: string
  default_lives: number
  xp_multiplier: number
  phases: PhaseConfig[]
}

interface LessonSessionConfig {
  _id?: { $oid: string }
  lesson_id: string
  phases?: PhaseConfig[] | null
  override_lives?: number | null
  override_xp_multiplier?: number | null
  pronunciation_sentences?: string[] | null
  conversation_prompt?: string | null
}

const PHASE_LABELS: Record<string, string> = {
  read: "📖 Read", flashcard: "🃏 Flashcards", vocab_drill: "🧩 Vocab Drill",
  game: "🎮 Games", pronunciation: "🎤 Pronunciation", conversation: "💬 Conversation",
}

export default function SessionConfig() {
  const [tab, setTab] = useState<"templates" | "overrides">("templates")
  const [templates, setTemplates] = useState<LevelTemplate[]>([])
  const [configs, setConfigs] = useState<LessonSessionConfig[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editTemplate, setEditTemplate] = useState<LevelTemplate | null>(null)
  const [editConfig, setEditConfig] = useState<LessonSessionConfig | null>(null)
  const [toast, setToast] = useState("")

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [t, c, l] = await Promise.all([getLevelTemplates(), getLessonConfigs(), getLessons()])
      setTemplates(t)
      setConfigs(c)
      setLessons(l)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  // ── Save Level Template ──
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

  // ── Save Lesson Override ──
  const saveConfig = async () => {
    if (!editConfig) return
    setSaving(true)
    try {
      await upsertLessonConfig(editConfig.lesson_id, editConfig)
      showToast("✅ Lesson config saved")
      setEditConfig(null)
      loadAll()
    } catch (e) {
      showToast("❌ Failed to save config")
    }
    setSaving(false)
  }

  const removeConfig = async (lessonId: string) => {
    if (!confirm("Remove this lesson override? It will inherit from the level template.")) return
    try {
      await deleteLessonConfig(lessonId)
      showToast("🗑️ Override removed")
      loadAll()
    } catch (e) {
      showToast("❌ Failed to remove")
    }
  }

  const getLessonTitle = (id: string) => {
    const l = lessons.find((ls: any) => (ls._id?.$oid || ls._id) === id)
    return l?.title || id.slice(0, 8) + "…"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Session Config</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure the immersive learning session pipeline — level templates and per-lesson overrides
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["templates", "overrides"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "templates" ? "🎓 Level Templates" : "📝 Lesson Overrides"}
          </button>
        ))}
      </div>

      {/* ── Level Templates Tab ── */}
      {tab === "templates" && !editTemplate && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.level}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setEditTemplate({ ...tmpl })}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-slate-800">{tmpl.level}</span>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                  {tmpl.name}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                <span>❤️ {tmpl.default_lives} lives</span>
                <span>⭐ {tmpl.xp_multiplier}x XP</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tmpl.phases.map((p) => (
                  <span
                    key={p.phase_type}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.enabled
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-400 line-through"
                    }`}
                  >
                    {PHASE_LABELS[p.phase_type] || p.phase_type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit Template ── */}
      {tab === "templates" && editTemplate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              Edit {editTemplate.level} — {editTemplate.name}
            </h3>
            <button onClick={() => setEditTemplate(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>

          {/* Basic settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Template Name</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={editTemplate.name}
                onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Default Lives</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={editTemplate.default_lives}
                onChange={(e) => setEditTemplate({ ...editTemplate, default_lives: +e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">XP Multiplier</label>
              <input
                type="number"
                step="0.1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={editTemplate.xp_multiplier}
                onChange={(e) => setEditTemplate({ ...editTemplate, xp_multiplier: +e.target.value })}
              />
            </div>
          </div>

          {/* Phase configs */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700">Phases</h4>
            {editTemplate.phases
              .sort((a, b) => a.order - b.order)
              .map((phase, idx) => (
                <PhaseEditor
                  key={phase.phase_type}
                  phase={phase}
                  onChange={(updated) => {
                    const phases = [...editTemplate.phases]
                    phases[idx] = updated
                    setEditTemplate({ ...editTemplate, phases })
                  }}
                />
              ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save Template"}
            </button>
            <button
              onClick={() => setEditTemplate(null)}
              className="px-6 py-2.5 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Lesson Overrides Tab ── */}
      {tab === "overrides" && !editConfig && (
        <div className="space-y-4">
          <button
            onClick={() =>
              setEditConfig({
                lesson_id: "",
                phases: null,
                override_lives: null,
                override_xp_multiplier: null,
                pronunciation_sentences: null,
                conversation_prompt: null,
              })
            }
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            + New Override
          </button>

          {configs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              No lesson overrides yet. All lessons inherit from their level template.
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((cfg) => (
                <div
                  key={cfg.lesson_id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {getLessonTitle(cfg.lesson_id)}
                    </p>
                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
                      {cfg.override_lives && <span>❤️ {cfg.override_lives} lives</span>}
                      {cfg.override_xp_multiplier && <span>⭐ {cfg.override_xp_multiplier}x</span>}
                      {cfg.pronunciation_sentences?.length && (
                        <span>🎤 {cfg.pronunciation_sentences.length} sentences</span>
                      )}
                      {cfg.conversation_prompt && <span>💬 Custom prompt</span>}
                      {cfg.phases && <span>🔧 Custom phases</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditConfig({ ...cfg })}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeConfig(cfg.lesson_id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Edit Lesson Override ── */}
      {tab === "overrides" && editConfig && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              {editConfig._id ? "Edit Override" : "New Override"}
            </h3>
            <button onClick={() => setEditConfig(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>

          {/* Lesson picker */}
          {!editConfig._id && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Lesson</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={editConfig.lesson_id}
                onChange={(e) => setEditConfig({ ...editConfig, lesson_id: e.target.value })}
              >
                <option value="">Select a lesson…</option>
                {lessons.map((l: any) => (
                  <option key={l._id?.$oid || l._id} value={l._id?.$oid || l._id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Override Lives (blank = inherit)</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={editConfig.override_lives ?? ""}
                onChange={(e) =>
                  setEditConfig({
                    ...editConfig,
                    override_lives: e.target.value ? +e.target.value : null,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Override XP Multiplier</label>
              <input
                type="number"
                step="0.1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={editConfig.override_xp_multiplier ?? ""}
                onChange={(e) =>
                  setEditConfig({
                    ...editConfig,
                    override_xp_multiplier: e.target.value ? +e.target.value : null,
                  })
                }
              />
            </div>
          </div>

          {/* Pronunciation sentences */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Pronunciation Sentences (one per line)
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              rows={4}
              value={(editConfig.pronunciation_sentences || []).join("\n")}
              onChange={(e) =>
                setEditConfig({
                  ...editConfig,
                  pronunciation_sentences: e.target.value
                    .split("\n")
                    .filter((s) => s.trim()),
                })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Conversation Prompt</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={editConfig.conversation_prompt ?? ""}
              onChange={(e) =>
                setEditConfig({
                  ...editConfig,
                  conversation_prompt: e.target.value || null,
                })
              }
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveConfig}
              disabled={saving || !editConfig.lesson_id}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Override"}
            </button>
            <button
              onClick={() => setEditConfig(null)}
              className="px-6 py-2.5 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Phase Editor Component ──
function PhaseEditor({
  phase,
  onChange,
}: {
  phase: PhaseConfig
  onChange: (p: PhaseConfig) => void
}) {
  const s = phase.settings

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        phase.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{PHASE_LABELS[phase.phase_type]}</span>
          <span className="text-[10px] text-slate-400 font-mono">order:{phase.order}</span>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={phase.enabled}
            onChange={(e) => onChange({ ...phase, enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          <span className="text-xs text-slate-500">Enabled</span>
        </label>
      </div>

      {phase.enabled && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {/* Game/Drill difficulty */}
          {(phase.phase_type === "game" || phase.phase_type === "vocab_drill") && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Difficulty</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                value={s.difficulty || "easy"}
                onChange={(e) =>
                  onChange({ ...phase, settings: { ...s, difficulty: e.target.value } })
                }
              >
                <option>easy</option>
                <option>medium</option>
                <option>hard</option>
              </select>
            </div>
          )}

          {/* Flashcard settings */}
          {phase.phase_type === "flashcard" && (
            <>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={s.auto_play_audio ?? true}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, auto_play_audio: e.target.checked } })
                  }
                  className="rounded border-slate-300"
                />
                <span className="text-xs text-slate-600">Auto-play audio</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={s.show_translation ?? true}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, show_translation: e.target.checked } })
                  }
                  className="rounded border-slate-300"
                />
                <span className="text-xs text-slate-600">Show translation</span>
              </label>
            </>
          )}

          {/* Pronunciation settings */}
          {phase.phase_type === "pronunciation" && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Sentences</label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  value={s.sentence_count ?? 3}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, sentence_count: +e.target.value } })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Min Accuracy %</label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  value={s.min_accuracy_score ?? 60}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, min_accuracy_score: +e.target.value } })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Speed</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  value={s.speed || "normal"}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, speed: e.target.value } })
                  }
                >
                  <option>slow</option>
                  <option>normal</option>
                  <option>fast</option>
                </select>
              </div>
            </>
          )}

          {/* Conversation settings */}
          {phase.phase_type === "conversation" && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Turns</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                value={s.turn_count ?? 3}
                onChange={(e) =>
                  onChange({ ...phase, settings: { ...s, turn_count: +e.target.value } })
                }
              />
            </div>
          )}

          {/* Vocab drill types */}
          {phase.phase_type === "vocab_drill" && (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Max Drills</label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  value={s.max_drill_count ?? 2}
                  onChange={(e) =>
                    onChange({ ...phase, settings: { ...s, max_drill_count: +e.target.value } })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Drill Types</label>
                <div className="flex gap-2 flex-wrap">
                  {["matching", "fill_in_the_blank", "word_scramble"].map((dt) => (
                    <label key={dt} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={(s.drill_types || []).includes(dt)}
                        onChange={(e) => {
                          const current = s.drill_types || []
                          const next = e.target.checked
                            ? [...current, dt]
                            : current.filter((d) => d !== dt)
                          onChange({ ...phase, settings: { ...s, drill_types: next } })
                        }}
                        className="rounded border-slate-300"
                      />
                      <span className="text-xs text-slate-600">{dt.replace(/_/g, " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
