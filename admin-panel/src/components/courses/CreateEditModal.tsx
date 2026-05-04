import { X, Loader2, Sparkles, Globe, History } from "lucide-react"
import { cn } from "../../lib/utils"

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
  if (!isModalOpen) return null;

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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">XP Reward</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={formData.xp_reward || 0}
                  onChange={e => setFormData({ ...formData, xp_reward: parseInt(e.target.value) })}
                />
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
    </div>
  )
}
