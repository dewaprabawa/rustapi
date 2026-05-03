import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "/admin"

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      if (currentPath !== "/login") {
        localStorage.removeItem("admin_token")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

// ============ Auth ============
export const adminLogin = (email: string, password: string) =>
  api.post("/login", { email, password })

export const getAdminMe = () =>
  api.get("/me")

// ============ Users ============
export const getUsers = (page = 1, limit = 20) =>
  api.get("/users", { params: { page, limit } }).then(r => r.data)

export const getUser = (id: string) =>
  api.get(`/users/${id}`).then(r => r.data)

export const deleteUser = (id: string) =>
  api.delete(`/users/${id}`).then(r => r.data)

// ============ Courses ============
export const getCourses = () =>
  api.get("/courses").then(r => r.data)

export const createCourse = (data: any) =>
  api.post("/courses", data).then(r => r.data)

export const updateCourse = (id: string, data: any) =>
  api.put(`/courses/${id}`, data).then(r => r.data)

export const deleteCourse = (id: string) =>
  api.delete(`/courses/${id}`).then(r => r.data)

// ============ Modules ============
export const getModules = () =>
  api.get("/modules").then(r => r.data)

export const createModule = (data: any) =>
  api.post("/modules", data).then(r => r.data)

export const updateModule = (id: string, data: any) =>
  api.put(`/modules/${id}`, data).then(r => r.data)

export const deleteModule = (id: string) =>
  api.delete(`/modules/${id}`).then(r => r.data)

// ============ Lessons ============
export const getLessons = () =>
  api.get("/lessons").then(r => r.data)

export const createLesson = (data: any) =>
  api.post("/lessons", data).then(r => r.data)

export const updateLesson = (id: string, data: any) =>
  api.put(`/lessons/${id}`, data).then(r => r.data)

export const deleteLesson = (id: string) =>
  api.delete(`/lessons/${id}`).then(r => r.data)

// ============ Vocabulary ============
export const getVocabulary = () =>
  api.get("/vocabulary").then(r => r.data)

export const getVocabularyById = (id: string) =>
  api.get(`/vocabulary/${id}`).then(r => r.data)

export const createVocabulary = (data: any) =>
  api.post("/vocabulary", data).then(r => r.data)

export const updateVocabulary = (id: string, data: any) =>
  api.put(`/vocabulary/${id}`, data).then(r => r.data)

export const deleteVocabularyItem = (id: string) =>
  api.delete(`/vocabulary/${id}`).then(r => r.data)

// ============ VocabForge AI ============
export const generateVocabSet = (data: { topic: string; level: string; word_count?: number; language?: string }) =>
  api.post("/ai/generate-vocab", {
    topic: data.topic,
    level: data.level,
    word_count: data.word_count,
    target_language: data.language
  }).then(r => r.data)

export const saveVocabSet = (data: { preview: any; level: string; language: string; topic: string }) =>
  api.post("/ai/save-vocab", data).then(r => r.data)

export const getVocabSets = () =>
  api.get("/vocab-sets").then(r => r.data)

export const getVocabSetWords = (id: string) =>
  api.get(`/vocab-sets/${id}/words`).then(r => r.data)

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
