import axios from "axios"
 

const BASE_URL = import.meta.env.VITE_API_URL || ""
const ADMIN_PREFIX = "/api/admin"

// For endpoints requiring the /admin prefix
export const api = axios.create({
  baseURL: `${BASE_URL}${ADMIN_PREFIX}`,
  headers: {
    "Content-Type": "application/json",
  },
})

// For endpoints at the root (like student auth)
export const rootApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Attach JWT token to every request
const authInterceptor = (config: any) => {
  const token = localStorage.getItem("auth_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

api.interceptors.request.use(authInterceptor)
rootApi.interceptors.request.use(authInterceptor)

// Auto-logout on 401
const responseInterceptor = (response: any) => response
const errorInterceptor = (error: any) => {
  if (error.response?.status === 401) {
    const currentPath = window.location.pathname
    if (currentPath !== "/login") {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user_type")
      window.location.href = "/login"
    }
  }
  return Promise.reject(error)
}

api.interceptors.response.use(responseInterceptor, errorInterceptor)
rootApi.interceptors.response.use(responseInterceptor, errorInterceptor)

// ============ Auth ============
export const adminLogin = (email: string, password: string) =>
  api.post("/login", { email, password })

export const getAdminMe = () =>
  api.get("/me")

export const updateAdminMe = (data: { name?: string, profile_image_url?: string }) =>
  api.put("/me", data).then(r => r.data)

export const getDashboardStats = () =>
  api.get("/dashboard/stats").then(r => r.data)

// ============ Users ============
export const getUsers = (page = 1, limit = 20) =>
  api.get("/users", { params: { page, limit } }).then(r => r.data)

export const getUser = (id: string) =>
  api.get(`/users/${id}`).then(r => r.data)

export const deleteUser = (id: string) =>
  api.delete(`/users/${id}`).then(r => r.data)

export const updateUser = (id: string, data: any) =>
  api.put(`/users/${id}`, data).then(r => r.data)

// ============ Courses ============
export const getCourses = () =>
  api.get("/courses").then(r => r.data)

export const getStudentCourses = () =>
  rootApi.get("/api/courses").then(r => r.data)

export const createCourse = (data: any) =>
  api.post("/courses", data).then(r => r.data)

export const updateCourse = (id: string, data: any) =>
  api.put(`/courses/${id}`, data).then(r => r.data)

export const deleteCourse = (id: string) =>
  api.delete(`/courses/${id}`).then(r => r.data)

export const getCoursePath = (id: string) =>
  rootApi.get(`/api/courses/${id}/path`).then(r => r.data)

// ============ Modules ============
export const getModules = () =>
  api.get("/modules").then(r => r.data)

export const createModule = (data: any) =>
  api.post("/modules", data).then(r => r.data)

export const updateModule = (id: string, data: any) =>
  api.put(`/modules/${id}`, data).then(r => r.data)

export const deleteModule = (id: string) =>
  api.delete(`/modules/${id}`).then(r => r.data)

export const reorderModules = (ids: string[]) =>
  api.patch("/modules/reorder", { ids }).then(r => r.data)

// ============ Lessons ============
export const getLessons = () =>
  api.get("/lessons").then(r => r.data)

export const getLesson = (id: string) =>
  api.get(`/lessons/${id}`).then(r => r.data)

export const createLesson = (data: any) =>
  api.post("/lessons", data).then(r => r.data)

export const updateLesson = (id: string, data: any) =>
  api.put(`/lessons/${id}`, data).then(r => r.data)

export const deleteLesson = (id: string) =>
  api.delete(`/lessons/${id}`).then(r => r.data)

export const reorderLessons = (ids: string[]) =>
  api.patch("/lessons/reorder", { ids }).then(r => r.data)

export const getLessonSession = (id: string) =>
  rootApi.get(`/api/lessons/${id}/session`).then(r => r.data)

// ============ Vocabulary ============
export const getVocabulary = (lessonId?: string) =>
  api.get(lessonId ? `/vocabulary?lesson_id=${lessonId}` : "/vocabulary").then(r => r.data)

export const getVocabularyById = (id: string) =>
  api.get(`/vocabulary/${id}`).then(r => r.data)

export const createVocabulary = (data: any) =>
  api.post("/vocabulary", data).then(r => r.data)

export const updateVocabulary = (id: string, data: any) =>
  api.put(`/vocabulary/${id}`, data).then(r => r.data)

export const deleteVocabularyItem = (id: string) =>
  api.delete(`/vocabulary/${id}`).then(r => r.data)

// ============ VocabForge AI ============
export const generateVocabSet = (data: { 
  topic: string; 
  level: string; 
  word_count?: number; 
  language?: string; 
  dialogue_sentence_count?: number; 
  set_type?: string;
  part_of_speech?: string;
  prompt_override?: string;
}) =>
  api.post("/ai/generate-vocab", {
    topic: data.topic,
    level: data.level,
    word_count: data.word_count,
    dialogue_sentence_count: data.dialogue_sentence_count,
    target_language: data.language,
    set_type: data.set_type,
    part_of_speech: data.part_of_speech,
    prompt_override: data.prompt_override
  }).then(r => r.data)

export const enrichVocabWord = (data: {
  word: string;
  level?: string;
  target_language?: string;
  part_of_speech?: string;
}) => api.post("/ai/enrich-word", data).then(r => r.data)

export const saveVocabSet = (data: { 
  preview: any; 
  level: string; 
  language: string; 
  topic: string; 
  set_type?: string;
  group_id?: string; // New
}) =>
  api.post("/ai/save-vocab", data).then(r => r.data)

export const getVocabSets = (type?: string) =>
  api.get("/vocab-sets", { params: { set_type: type } }).then(r => r.data)

export const getVocabSetWords = (id: string) =>
  api.get(`/vocab-sets/${id}/words`).then(r => r.data)

export const updateVocabSet = (id: string, data: any) =>
  api.put(`/vocab-sets/${id}`, data).then(r => r.data)

export const updateVocabWord = (setId: string, wordId: string, data: any) =>
  api.put(`/vocab-sets/${setId}/words/${wordId}`, data).then(r => r.data)

export const deleteVocabSet = (id: string) =>
  api.delete(`/vocab-sets/${id}`).then(r => r.data)

export const deleteVocabWord = (setId: string, wordId: string) =>
  api.delete(`/vocab-sets/${setId}/words/${wordId}`).then(r => r.data)

// ============ Vocab Groups ============
export const getVocabGroups = () =>
  api.get("/vocab-groups").then(r => r.data)

export const createVocabGroup = (data: any) =>
  api.post("/vocab-groups", data).then(r => r.data)

export const updateVocabGroup = (id: string, data: any) =>
  api.put(`/vocab-groups/${id}`, data).then(r => r.data)

export const deleteVocabGroup = (id: string) =>
  api.delete(`/vocab-groups/${id}`).then(r => r.data)

// ============ Conversation Requests ============
export const getConversationRequests = () =>
  api.get("/conversation-requests").then(r => r.data)

export const generateConversationScenario = (id: string) =>
  api.post(`/conversation-requests/${id}/generate`).then(r => r.data)

// ============ Dialogues ============
export const getDialogues = () =>
  api.get("/dialogues").then(r => r.data)

export const getDialogue = (id: string) =>
  api.get(`/dialogues/${id}`).then(r => r.data)

export const createDialogue = (data: any) =>
  api.post("/dialogues", data).then(r => r.data)

export const updateDialogue = (id: string, data: any) =>
  api.put(`/dialogues/${id}`, data).then(r => r.data)

export const deleteDialogueItem = (id: string) =>
  api.delete(`/dialogues/${id}`).then(r => r.data)

// ============ Quizzes ============
export const getQuizzes = () =>
  api.get("/quizzes").then(r => r.data)

export const getQuiz = (id: string) =>
  api.get(`/quizzes/${id}`).then(r => r.data)

export const createQuiz = (data: any) =>
  api.post("/quizzes", data).then(r => r.data)

export const updateQuiz = (id: string, data: any) =>
  api.put(`/quizzes/${id}`, data).then(r => r.data)

export const deleteQuizItem = (id: string) =>
  api.delete(`/quizzes/${id}`).then(r => r.data)

// ============ AI Scenarios ============
export const getScenarios = () =>
  api.get("/scenarios").then(r => r.data)

export const getScenario = (id: string) =>
  api.get(`/scenarios/${id}`).then(r => r.data)

export const createScenario = (data: any) =>
  api.post("/scenarios", data).then(r => r.data)

export const updateScenario = (id: string, data: any) =>
  api.put(`/scenarios/${id}`, data).then(r => r.data)

export const deleteScenario = (id: string) =>
  api.delete(`/scenarios/${id}`).then(r => r.data)

// ============ AI Config ============
export const getAiConfigs = () =>
  api.get("/ai-config").then(r => r.data)

export const updateAiConfig = (key: string, data: any) =>
  api.put(`/ai-config/${key}`, data).then(r => r.data)

// ============ Evaluation Weights ============
export const getEvaluationWeights = () =>
  api.get("/evaluation-weights").then(r => r.data)

export const updateEvaluationWeights = (data: any) =>
  api.put("/evaluation-weights", data).then(r => r.data)

// ============ Gamification ============
export const getGamificationConfig = () =>
  api.get("/gamification").then(r => r.data)

export const updateGamificationConfig = (data: any) =>
  api.put("/gamification", data).then(r => r.data)

// ============ Games ============
export const getGames = () =>
  api.get("/games").then(r => r.data)

export const createGame = (data: any) =>
  api.post("/games", data).then(r => r.data)

export const updateGame = (id: string, data: any) =>
  api.put(`/games/${id}`, data).then(r => r.data)

export const deleteGame = (id: string) =>
  api.delete(`/games/${id}`).then(r => r.data)

// ============ Ratings ============
export const getRatings = () =>
  api.get("/ratings").then(r => r.data)

// ============ Features & Monetization ============
export const getFeatures = () =>
  api.get("/features").then(r => r.data)

export const updateFeature = (name: string, data: any) =>
  api.put(`/features/${name}`, data).then(r => r.data)

export const getMonetizationConfig = () =>
  api.get("/monetization/config").then(r => r.data)

export const updateMonetizationConfig = (data: any) =>
  api.put("/monetization/config", data).then(r => r.data)

// ============ Notifications ============
export const sendNotification = (data: any) =>
  api.post("/notifications", data).then(r => r.data)

export const getAdminNotifications = (page = 1, limit = 20) =>
  api.get("/notifications", { params: { page, limit } }).then(r => r.data)

export const markAdminNotificationRead = (id: string) =>
  api.put(`/notifications/${id}/read`).then(r => r.data)

// ============ Assets ============
export const uploadAsset = (file: File) => {
  const formData = new FormData()
  formData.append("file", file)
  return api.post("/assets/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }).then(r => r.data)
}

// ============ LLM API Keys ============
export const getApiKeys = () =>
  api.get("/api-keys").then(r => r.data)

export const createApiKey = (data: { provider: string, name: string, api_key: string }) =>
  api.post("/api-keys", data).then(r => r.data)

export const deleteApiKey = (id: string) =>
  api.delete(`/api-keys/${id}`).then(r => r.data)

export const activateApiKey = (id: string) =>
  api.put(`/api-keys/${id}/activate`).then(r => r.data)

// ============ AI Translation & Generation ============
export const translateText = (text: string, from?: string, to?: string) =>
  api.post("/translate", { text, from, to }).then(r => r.data)

export const aiGenerateContent = (entity_type: string, context?: string) =>
  api.post("/ai-generate", { entity_type, context }).then(r => r.data)

// ============ Content Version History ============
export const getContentVersions = (entity_type: string, entity_id: string) =>
  api.get(`/versions/${entity_type}/${entity_id}`).then(r => r.data)

export const rollbackContentVersion = (entity_type: string, entity_id: string, version: number) =>
  api.post(`/versions/${entity_type}/${entity_id}/rollback/${version}`).then(r => r.data)

export const cloneContent = (entity_type: string, entity_id: string) =>
  api.post(`/clone/${entity_type}/${entity_id}`).then(r => r.data)

// ============ AI Prompts ============
export const getAiPrompts = () =>
  api.get("/ai-prompts").then(r => r.data)

export const updateAiPrompt = (entity_type: string, prompt_template: string) =>
  api.put(`/ai-prompts/${entity_type}`, { prompt_template }).then(r => r.data)

// ============ AI Course Generator ============
export const generateCourse = (data: {
  topic: string
  level: string
  category: string
  skill_focus?: string[]
  target_age?: string
  num_modules?: number
  lessons_per_module?: number
  vocab_per_lesson?: number
}) => api.post("/ai/generate-course", data).then(r => r.data)

export const saveCourse = (preview: any) =>
  api.post("/ai/save-course", { preview }).then(r => r.data)

export const getCreditUsage = () =>
  api.get("/ai/credit-usage").then(r => r.data)

// ============ Voice Abstraction ============
export const getVoiceConfig = () =>
  api.get("/voice/config").then(r => r.data)

export const updateVoiceConfig = (data: any) =>
  api.put("/voice/config", data).then(r => r.data)

export const testTts = (data: { text: string, voice_id: string }) =>
  api.post("/voice/tts", data, { responseType: 'blob' }).then(r => r.data)

// ============ Speaking Monitor ============
export const getSpeakingSessions = () =>
  api.get("/speaking/sessions").then(r => r.data)

export const getSpeakingScenarios = () =>
  api.get("/speaking/scenarios").then(r => r.data)

export const createSpeakingScenario = (data: any) =>
  api.post("/speaking/scenarios", data).then(r => r.data)

export const updateSpeakingScenario = (id: string, data: any) =>
  api.put(`/speaking/scenarios/${id}`, data).then(r => r.data)

export const deleteSpeakingScenario = (id: string) =>
  api.delete(`/speaking/scenarios/${id}`).then(r => r.data)

export const aiGenerateSpeakingScenario = (data: { topic: string; level: string }) =>
  api.post("/speaking/scenarios/ai-generate", data).then(r => r.data)

export const startSpeakingTest = (scenarioId: string) =>
  api.post(`/speaking/test/start/${scenarioId}`).then(r => r.data)

export const sendSpeakingTestTurn = (sessionId: string, text: string) =>
  api.post(`/speaking/test/turn/${sessionId}`, { text }).then(r => r.data)

// ============ SpeakUp Fluency ============
export const getSpeakUpContent = () =>
  api.get("/speakup/content").then(r => r.data)

export const getSpeakUpContentById = (id: string) =>
  api.get(`/speakup/content/${id}`).then(r => r.data)

export const createSpeakUpContent = (data: any) =>
  api.post("/speakup/content", data).then(r => r.data)

export const updateSpeakUpContent = (id: string, data: any) =>
  api.put(`/speakup/content/${id}`, data).then(r => r.data)

export const deleteSpeakUpContent = (id: string) =>
  api.delete(`/speakup/content/${id}`).then(r => r.data)

export const aiGenerateSpeakUp = (data: { topic: string; content_type: string; difficulty: string }) =>
  api.post("/speakup/ai-generate", data).then(r => r.data)

export const analyzeSpeakUpTest = (contentId: string, audioBlob: Blob) => {
  const formData = new FormData()
  formData.append("audio", audioBlob, "recording.wav")
  formData.append("content_id", contentId)
  return api.post("/speakup/test-analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }).then(r => r.data)
}

export const testSpeakUpListen = (data: { content_id: string; step_index?: number }) =>
  api.post("/speakup/test-listen", data, { responseType: 'blob' }).then(r => r.data)

// Master Data
export const getMasterData = (category: string) => 
  api.get(`/master-data/${category}`).then(r => r.data)

export const updateMasterData = (category: string, options: string[]) => 
  api.put(`/master-data/${category}`, { options }).then(r => r.data)

export const listMasterData = () => 
  api.get("/master-data").then(r => r.data)

// ============ Session Config (Level Templates & Lesson Overrides) ============
export const getLevelTemplates = () =>
  api.get("/level-templates").then(r => r.data)

export const getLevelTemplate = (level: string) =>
  api.get(`/level-templates/${level}`).then(r => r.data)

export const updateLevelTemplate = (level: string, data: any) =>
  api.put(`/level-templates/${level}`, data).then(r => r.data)

export const getLessonConfigs = () =>
  api.get("/lesson-configs").then(r => r.data)

export const getLessonConfig = (lessonId: string) =>
  api.get(`/lesson-configs/${lessonId}`).then(r => r.data)

export const upsertLessonConfig = (lessonId: string, data: any) =>
  api.put(`/lesson-configs/${lessonId}`, data).then(r => r.data)

export const deleteLessonConfig = (lessonId: string) =>
  api.delete(`/lesson-configs/${lessonId}`).then(r => r.data)

// ============ Ebooks & Curriculum ============
export const getCurriculum = () =>
  api.get("/curriculum").then(r => r.data)

export const getBooks = () =>
  api.get("/books").then(r => r.data)

export const uploadBook = (data: { title: string, status?: string }) =>
  api.post("/books", data).then(r => r.data)

export const generateEbook = (data: {
  stage: number
  course: number
  module: number
  lessons: number[]
  level: string
  reference_book_id?: string
}) => api.post("/ebook/generate", data).then(r => r.data)

export const getEbook = (id: string) =>
  api.get(`/ebook/${id}`).then(r => r.data)

export const updateEbook = (id: string, data: { lessons?: any[], status?: string }) =>
  api.put(`/ebook/${id}`, data).then(r => r.data)

export const exportEbook = (id: string) =>
  api.post(`/ebook/${id}/export`).then(r => r.data)

// ============ Progress ============
export const submitLessonCompletion = (lessonId: string, xp: number) =>
  rootApi.post("/progress/xp", { lesson_id: lessonId, xp }).then(r => r.data)
