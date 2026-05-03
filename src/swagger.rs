use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Hospitality English Learning API",
        version = "1.0.0",
        description = "REST API for the Hospitality English Learning platform — courses, interviews, games, progress & more. 🏨✈️🚢"
    ),
    tags(
        (name = "Auth", description = "User authentication & onboarding"),
        (name = "Admin Auth", description = "Admin login & profile"),
        (name = "Admin Users", description = "Admin user management"),
        (name = "Admin Content", description = "CMS for courses, modules, lessons, vocabulary, dialogues & quizzes"),
        (name = "Admin AI", description = "AI content generation & tools"),
        (name = "Admin API Keys", description = "LLM API key management"),
        (name = "Admin Interviews", description = "Interview scenario & question management"),
        (name = "Admin AI Config", description = "AI prompt & evaluation weight configuration"),
        (name = "Admin Gamification", description = "Gamification & XP configuration"),
        (name = "Admin Games", description = "Game engine content management"),
        (name = "Admin Ratings", description = "View lesson ratings"),
        (name = "Admin Monetization", description = "Feature access & monetization config"),
        (name = "Public Content", description = "Public course/lesson browsing for mobile app"),
        (name = "Public Interviews", description = "AI interview sessions"),
        (name = "Progress", description = "User XP, quiz & game progress tracking"),
        (name = "Game Sessions", description = "Interactive game engine sessions"),
        (name = "Student Vocab", description = "Student vocabulary lists & progress"),
        (name = "Ratings", description = "User lesson ratings"),
        (name = "Notifications", description = "User & system notifications"),
        (name = "Voice", description = "Speech-to-text & Text-to-speech services"),
    ),
    paths(
        // Auth
        crate::swagger::auth_register,
        crate::swagger::auth_login,
        crate::swagger::auth_firebase,
        crate::swagger::auth_me,
        crate::swagger::auth_onboarding,
        crate::swagger::auth_upload_profile_image,
        crate::swagger::auth_update_fcm_token,
        // Admin Auth
        crate::swagger::admin_login,
        crate::swagger::admin_me,
        // Admin Users
        crate::swagger::admin_list_users,
        crate::swagger::admin_get_user,
        crate::swagger::admin_delete_user,
        // Admin Content
        crate::swagger::admin_list_courses,
        crate::swagger::admin_create_course,
        crate::swagger::admin_get_course,
        crate::swagger::admin_update_course,
        crate::swagger::admin_delete_course,
        crate::swagger::admin_list_modules,
        crate::swagger::admin_create_module,
        crate::swagger::admin_update_module,
        crate::swagger::admin_delete_module,
        crate::swagger::admin_list_lessons,
        crate::swagger::admin_create_lesson,
        crate::swagger::admin_update_lesson,
        crate::swagger::admin_delete_lesson,
        crate::swagger::admin_list_vocabulary,
        crate::swagger::admin_create_vocabulary,
        crate::swagger::admin_get_vocabulary,
        crate::swagger::admin_update_vocabulary,
        crate::swagger::admin_delete_vocabulary,
        crate::swagger::admin_list_dialogues,
        crate::swagger::admin_create_dialogue,
        crate::swagger::admin_get_dialogue,
        crate::swagger::admin_update_dialogue,
        crate::swagger::admin_delete_dialogue,
        crate::swagger::admin_list_quizzes,
        crate::swagger::admin_create_quiz,
        crate::swagger::admin_get_quiz,
        crate::swagger::admin_update_quiz,
        crate::swagger::admin_delete_quiz,
        crate::swagger::admin_upload_asset,
        crate::swagger::admin_list_content_versions,
        crate::swagger::admin_rollback_content_version,
        crate::swagger::admin_clone_content,
        // Admin AI
        crate::swagger::admin_generate_course,
        crate::swagger::admin_save_course,
        crate::swagger::admin_generate_vocab,
        crate::swagger::admin_save_vocab,
        crate::swagger::admin_get_credit_usage,
        crate::swagger::admin_translate,
        crate::swagger::admin_ai_generate_content,
        crate::swagger::admin_list_conversation_requests,
        crate::swagger::admin_fulfill_conversation_request,
        crate::swagger::admin_list_speaking_sessions,
        // Admin API Keys
        crate::swagger::admin_list_api_keys,
        crate::swagger::admin_create_api_key,
        crate::swagger::admin_delete_api_key,
        crate::swagger::admin_activate_api_key,
        // Admin Interviews
        crate::swagger::admin_list_scenarios,
        crate::swagger::admin_create_scenario,
        crate::swagger::admin_get_scenario,
        crate::swagger::admin_update_scenario,
        crate::swagger::admin_delete_scenario,
        crate::swagger::admin_add_question,
        crate::swagger::admin_delete_question,
        // Admin AI Config
        crate::swagger::admin_list_ai_configs,
        crate::swagger::admin_update_ai_config,
        crate::swagger::admin_get_eval_weights,
        crate::swagger::admin_update_eval_weights,
        crate::swagger::admin_get_ai_prompts,
        crate::swagger::admin_update_ai_prompt,
        // Admin Gamification
        crate::swagger::admin_get_gamification,
        crate::swagger::admin_update_gamification,
        // Admin Games
        crate::swagger::admin_list_games,
        crate::swagger::admin_create_game,
        crate::swagger::admin_update_game,
        crate::swagger::admin_delete_game,
        // Admin Ratings
        crate::swagger::admin_list_ratings,
        // Admin Monetization
        crate::swagger::admin_list_features,
        crate::swagger::admin_update_feature,
        crate::swagger::admin_get_monetization_config,
        crate::swagger::admin_update_monetization_config,
        // Public Content
        crate::swagger::public_recommendations,
        crate::swagger::public_list_courses,
        crate::swagger::public_list_modules,
        crate::swagger::public_list_lessons,
        crate::swagger::public_get_lesson,
        crate::swagger::public_list_lesson_games,
        crate::swagger::public_list_scenarios,
        crate::swagger::public_get_scenario,
        // Public Interviews
        crate::swagger::public_start_interview,
        crate::swagger::public_send_chat,
        crate::swagger::public_complete_interview,
        // Progress
        crate::swagger::get_progress,
        crate::swagger::add_xp,
        crate::swagger::submit_quiz,
        crate::swagger::submit_game_result,
        crate::swagger::submit_speaking_result,
        // Game Sessions
        crate::swagger::start_game_session,
        crate::swagger::submit_game_answer,
        crate::swagger::sync_offline_sessions,
        crate::swagger::score_pronunciation,
        // Speaking Practice
        crate::swagger::speaking_start_session,
        crate::swagger::speaking_session_turn,
        crate::swagger::speaking_end_session,
        // Student Vocab
        crate::swagger::student_list_vocab_sets,
        crate::swagger::student_get_vocab_words,
        crate::swagger::student_submit_vocab_progress,
        crate::swagger::student_toggle_bookmark,
        crate::swagger::student_get_bookmarks,
        crate::swagger::student_list_conversation_requests,
        crate::swagger::student_create_conversation_request,
        // Ratings
        crate::swagger::submit_lesson_rating,
        // Notifications
        crate::swagger::admin_send_notification,
        crate::swagger::list_notifications,
        crate::swagger::mark_notification_read,
        // Voice
        crate::swagger::admin_get_voice_config,
        crate::swagger::admin_update_voice_config,
        crate::swagger::voice_stt,
        crate::swagger::voice_tts,
        // Auth Additional
        crate::swagger::auth_update_profile,
        crate::swagger::admin_ping,
        // Admin Vocab Sets
        crate::swagger::admin_list_vocab_sets,
        crate::swagger::admin_get_vocab_words,
    ),
    components(schemas(
        // Generic
        ErrorResponse, PaginationParams,
        // Auth schemas
        RegisterRequest, LoginRequest, FirebaseLoginRequest, OnboardingRequest, UpdateFcmTokenRequestPublic, UpdateProfileRequest, AuthResponse, UserPublic, Persona, Progress,
        // Admin
        AdminLoginRequest, AdminAuthResponse, AdminPublic, Role,
        // AI & API Keys
        GenerateCourseRequest, SaveCourseRequest, GenerateVocabRequest, AiGenerationLog, CreditUsageSummary, LlmApiKey, CreateLlmApiKeyRequest,
        TranslateRequest, AiGenerateRequest, AIPromptConfig, UpdatePromptRequest,
        // Content CMS
        DialogueLine, SkillType, ContentLevel, ContentCategory, CourseStatus, TargetAge, Visibility,
        // Voice
        VoiceConfig, SpeechToTextResponse, TextToSpeechResponse,
        // Student Vocab
        VocabSet, VocabWord, ConversationRequest, StudentVocabProgressRequest,
        // Game Sessions
        GameSessionStartRequest, GameAnswerRequest, OfflineSyncRequest, VoiceScoreRequest, VoiceScoreResponse,
        // Notifications
        NotificationRequestPublic, NotificationPublic,
    )),
    security(
        ("bearer_auth" = [])
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

// ── Security modifier ──

struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                utoipa::openapi::security::SecurityScheme::Http(
                    utoipa::openapi::security::Http::new(
                        utoipa::openapi::security::HttpAuthScheme::Bearer,
                    ),
                ),
            );
        }
    }
}

// ── Shared Schema types (lightweight copies for docs only) ──

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct FirebaseLoginRequest {
    pub id_token: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct OnboardingRequest {
    pub level: String,
    pub tone: String,
    pub goal: String,
    pub weakness: Option<String>,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct UpdateFcmTokenRequestPublic {
    pub fcm_token: String,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct Persona {
    pub level: String,
    pub tone: String,
    pub goal: String,
    pub weakness: Option<String>,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct Progress {
    pub streak_days: i32,
    pub total_practice: i32,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct UserPublic {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub profile_image_url: Option<String>,
    pub fcm_token: Option<String>,
    pub persona: Persona,
    pub progress: Progress,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserPublic,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct AdminLoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct AdminPublic {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct AdminAuthResponse {
    pub token: String,
    pub admin: AdminPublic,
}

#[derive(utoipa::ToSchema, utoipa::IntoParams, serde::Deserialize)]
pub struct PaginationParams {
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

// ──────────────────────────────────────────────
//  Path stubs — utoipa needs a function per path
// ──────────────────────────────────────────────

// ── Auth ──

#[utoipa::path(post, path = "/auth/register", tag = "Auth",
    request_body = RegisterRequest,
    responses((status = 201, description = "User registered", body = AuthResponse),
              (status = 409, description = "User already exists", body = ErrorResponse)))]
pub async fn auth_register() {}

#[utoipa::path(post, path = "/auth/login", tag = "Auth",
    request_body = LoginRequest,
    responses((status = 200, body = AuthResponse),
              (status = 401, body = ErrorResponse)))]
pub async fn auth_login() {}

#[utoipa::path(post, path = "/auth/firebase", tag = "Auth",
    request_body = FirebaseLoginRequest,
    responses((status = 200, body = AuthResponse),
              (status = 401, body = ErrorResponse)))]
pub async fn auth_firebase() {}

#[utoipa::path(get, path = "/auth/me", tag = "Auth", security(("bearer_auth" = [])),
    responses((status = 200, body = UserPublic)))]
pub async fn auth_me() {}

#[utoipa::path(put, path = "/auth/onboarding", tag = "Auth", security(("bearer_auth" = [])),
    request_body = OnboardingRequest,
    responses((status = 200, body = UserPublic)))]
pub async fn auth_onboarding() {}

#[utoipa::path(post, path = "/auth/profile-image", tag = "Auth", security(("bearer_auth" = [])),
    request_body(content = String, description = "Image file", content_type = "multipart/form-data"),
    responses((status = 200, description = "Profile image uploaded", body = UserPublic)))]
pub async fn auth_upload_profile_image() {}

#[utoipa::path(put, path = "/auth/fcm-token", tag = "Auth", security(("bearer_auth" = [])),
    request_body = UpdateFcmTokenRequestPublic,
    responses((status = 200, description = "FCM token updated successfully")))]
pub async fn auth_update_fcm_token() {}

#[utoipa::path(put, path = "/auth/profile", tag = "Auth", security(("bearer_auth" = [])),
    request_body = UpdateProfileRequest,
    responses((status = 200, body = UserPublic)))]
pub async fn auth_update_profile() {}

// ── Admin Auth ──

#[utoipa::path(post, path = "/admin/login", tag = "Admin Auth",
    request_body = AdminLoginRequest,
    responses((status = 200, body = AdminAuthResponse)))]
pub async fn admin_login() {}

#[utoipa::path(get, path = "/admin/me", tag = "Admin Auth", security(("bearer_auth" = [])),
    responses((status = 200, body = AdminPublic)))]
pub async fn admin_me() {}

#[utoipa::path(get, path = "/admin/ping", tag = "Admin Auth",
    responses((status = 200, description = "Admin API is reachable")))]
pub async fn admin_ping() {}

// ── Admin Users ──

#[utoipa::path(get, path = "/admin/users", tag = "Admin Users", security(("bearer_auth" = [])),
    params(PaginationParams),
    responses((status = 200, description = "Paginated user list")))]
pub async fn admin_list_users() {}

#[utoipa::path(get, path = "/admin/users/{id}", tag = "Admin Users", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "User ID")),
    responses((status = 200, description = "User details")))]
pub async fn admin_get_user() {}

#[utoipa::path(delete, path = "/admin/users/{id}", tag = "Admin Users", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "User ID")),
    responses((status = 200, description = "User deleted")))]
pub async fn admin_delete_user() {}

// ── Admin Content ──

#[utoipa::path(get, path = "/admin/courses", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 200, description = "List courses")))]
pub async fn admin_list_courses() {}

#[utoipa::path(post, path = "/admin/courses", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 201, description = "Course created")))]
pub async fn admin_create_course() {}

#[utoipa::path(get, path = "/admin/courses/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Course ID")),
    responses((status = 200, description = "Course details")))]
pub async fn admin_get_course() {}

#[utoipa::path(put, path = "/admin/courses/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Course ID")),
    responses((status = 200, description = "Course updated")))]
pub async fn admin_update_course() {}

#[utoipa::path(delete, path = "/admin/courses/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Course ID")),
    responses((status = 200, description = "Course deleted")))]
pub async fn admin_delete_course() {}

#[utoipa::path(get, path = "/admin/modules", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 200, description = "List modules")))]
pub async fn admin_list_modules() {}

#[utoipa::path(post, path = "/admin/modules", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 201, description = "Module created")))]
pub async fn admin_create_module() {}

#[utoipa::path(put, path = "/admin/modules/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Module ID")),
    responses((status = 200, description = "Module updated")))]
pub async fn admin_update_module() {}

#[utoipa::path(delete, path = "/admin/modules/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Module ID")),
    responses((status = 200, description = "Module deleted")))]
pub async fn admin_delete_module() {}

#[utoipa::path(get, path = "/admin/lessons", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 200, description = "List lessons")))]
pub async fn admin_list_lessons() {}

#[utoipa::path(post, path = "/admin/lessons", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 201, description = "Lesson created")))]
pub async fn admin_create_lesson() {}

#[utoipa::path(put, path = "/admin/lessons/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Lesson ID")),
    responses((status = 200, description = "Lesson updated")))]
pub async fn admin_update_lesson() {}

#[utoipa::path(delete, path = "/admin/lessons/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Lesson ID")),
    responses((status = 200, description = "Lesson deleted")))]
pub async fn admin_delete_lesson() {}

#[utoipa::path(get, path = "/admin/vocabulary", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 200, description = "List vocabulary")))]
pub async fn admin_list_vocabulary() {}

#[utoipa::path(post, path = "/admin/vocabulary", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 201, description = "Vocabulary created")))]
pub async fn admin_create_vocabulary() {}

#[utoipa::path(get, path = "/admin/dialogues", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 200, description = "List dialogues")))]
pub async fn admin_list_dialogues() {}

#[utoipa::path(post, path = "/admin/dialogues", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 201, description = "Dialogue created")))]
pub async fn admin_create_dialogue() {}

#[utoipa::path(get, path = "/admin/quizzes", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 200, description = "List quizzes")))]
pub async fn admin_list_quizzes() {}

#[utoipa::path(post, path = "/admin/quizzes", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 201, description = "Quiz created")))]
pub async fn admin_create_quiz() {}

#[utoipa::path(get, path = "/admin/vocabulary/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Vocabulary ID")),
    responses((status = 200, description = "Vocabulary details")))]
pub async fn admin_get_vocabulary() {}

#[utoipa::path(put, path = "/admin/vocabulary/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Vocabulary ID")),
    responses((status = 200, description = "Vocabulary updated")))]
pub async fn admin_update_vocabulary() {}

#[utoipa::path(delete, path = "/admin/vocabulary/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Vocabulary ID")),
    responses((status = 200, description = "Vocabulary deleted")))]
pub async fn admin_delete_vocabulary() {}

#[utoipa::path(get, path = "/admin/dialogues/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Dialogue ID")),
    responses((status = 200, description = "Dialogue details")))]
pub async fn admin_get_dialogue() {}

#[utoipa::path(put, path = "/admin/dialogues/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Dialogue ID")),
    responses((status = 200, description = "Dialogue updated")))]
pub async fn admin_update_dialogue() {}

#[utoipa::path(delete, path = "/admin/dialogues/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Dialogue ID")),
    responses((status = 200, description = "Dialogue deleted")))]
pub async fn admin_delete_dialogue() {}

#[utoipa::path(get, path = "/admin/quizzes/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Quiz ID")),
    responses((status = 200, description = "Quiz details")))]
pub async fn admin_get_quiz() {}

#[utoipa::path(put, path = "/admin/quizzes/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Quiz ID")),
    responses((status = 200, description = "Quiz updated")))]
pub async fn admin_update_quiz() {}

#[utoipa::path(delete, path = "/admin/quizzes/{id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Quiz ID")),
    responses((status = 200, description = "Quiz deleted")))]
pub async fn admin_delete_quiz() {}

#[utoipa::path(post, path = "/admin/assets/upload", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 200, description = "Asset uploaded")))]
pub async fn admin_upload_asset() {}

#[utoipa::path(get, path = "/admin/versions/{entity_type}/{entity_id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("entity_type" = String, Path), ("entity_id" = String, Path)),
    responses((status = 200, description = "Version history")))]
pub async fn admin_list_content_versions() {}

#[utoipa::path(post, path = "/admin/versions/{entity_type}/{entity_id}/rollback/{version}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("entity_type" = String, Path), ("entity_id" = String, Path), ("version" = i32, Path)),
    responses((status = 200, description = "Rolled back")))]
pub async fn admin_rollback_content_version() {}

#[utoipa::path(post, path = "/admin/clone/{entity_type}/{entity_id}", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("entity_type" = String, Path), ("entity_id" = String, Path)),
    responses((status = 201, description = "Cloned successfully")))]
pub async fn admin_clone_content() {}

// ── Admin Interviews ──

#[utoipa::path(get, path = "/admin/scenarios", tag = "Admin Interviews", security(("bearer_auth" = [])),
    responses((status = 200, description = "List scenarios")))]
pub async fn admin_list_scenarios() {}

#[utoipa::path(post, path = "/admin/scenarios", tag = "Admin Interviews", security(("bearer_auth" = [])),
    responses((status = 201, description = "Scenario created")))]
pub async fn admin_create_scenario() {}

#[utoipa::path(get, path = "/admin/scenarios/{id}", tag = "Admin Interviews", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Scenario ID")),
    responses((status = 200, description = "Scenario details")))]
pub async fn admin_get_scenario() {}

#[utoipa::path(put, path = "/admin/scenarios/{id}", tag = "Admin Interviews", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Scenario ID")),
    responses((status = 200, description = "Scenario updated")))]
pub async fn admin_update_scenario() {}

#[utoipa::path(delete, path = "/admin/scenarios/{id}", tag = "Admin Interviews", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Scenario ID")),
    responses((status = 200, description = "Scenario deleted")))]
pub async fn admin_delete_scenario() {}

#[utoipa::path(post, path = "/admin/questions", tag = "Admin Interviews", security(("bearer_auth" = [])),
    responses((status = 201, description = "Question added")))]
pub async fn admin_add_question() {}

#[utoipa::path(put, path = "/admin/questions/{id}", tag = "Admin Interviews", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Question ID")),
    responses((status = 200, description = "Question deleted")))]
pub async fn admin_delete_question() {}

// ── Admin AI ──

#[utoipa::path(post, path = "/admin/ai/generate-course", tag = "Admin AI", security(("bearer_auth" = [])),
    request_body = GenerateCourseRequest,
    responses((status = 200, description = "Course preview generated")))]
pub async fn admin_generate_course() {}

#[utoipa::path(post, path = "/admin/ai/save-course", tag = "Admin AI", security(("bearer_auth" = [])),
    request_body = SaveCourseRequest,
    responses((status = 201, description = "Course saved successfully")))]
pub async fn admin_save_course() {}

#[utoipa::path(post, path = "/admin/ai/generate-vocab", tag = "Admin AI", security(("bearer_auth" = [])),
    request_body = GenerateVocabRequest,
    responses((status = 200, description = "Vocabulary set generated")))]
pub async fn admin_generate_vocab() {}

#[utoipa::path(post, path = "/admin/ai/save-vocab", tag = "Admin AI", security(("bearer_auth" = [])),
    responses((status = 201, description = "Vocabulary set saved")))]
pub async fn admin_save_vocab() {}

#[utoipa::path(get, path = "/admin/ai/credit-usage", tag = "Admin AI", security(("bearer_auth" = [])),
    responses((status = 200, body = CreditUsageSummary)))]
pub async fn admin_get_credit_usage() {}

#[utoipa::path(post, path = "/admin/translate", tag = "Admin AI", security(("bearer_auth" = [])),
    request_body = TranslateRequest,
    responses((status = 200, description = "Translated text")))]
pub async fn admin_translate() {}

#[utoipa::path(post, path = "/admin/ai-generate", tag = "Admin AI", security(("bearer_auth" = [])),
    request_body = AiGenerateRequest,
    responses((status = 200, description = "Generated content")))]
pub async fn admin_ai_generate_content() {}

#[utoipa::path(get, path = "/admin/conversation-requests", tag = "Admin AI", security(("bearer_auth" = [])),
    responses((status = 200, body = Vec<ConversationRequest>)))]
pub async fn admin_list_conversation_requests() {}

#[utoipa::path(post, path = "/admin/conversation-requests/{id}/generate", tag = "Admin AI", security(("bearer_auth" = [])),
    params(("id" = String, Path)),
    responses((status = 200, description = "Scenario generated")))]
pub async fn admin_fulfill_conversation_request() {}

// ── Admin API Keys ──

#[utoipa::path(get, path = "/admin/api-keys", tag = "Admin API Keys", security(("bearer_auth" = [])),
    responses((status = 200, body = Vec<LlmApiKey>)))]
pub async fn admin_list_api_keys() {}

#[utoipa::path(post, path = "/admin/api-keys", tag = "Admin API Keys", security(("bearer_auth" = [])),
    request_body = CreateLlmApiKeyRequest,
    responses((status = 201, body = LlmApiKey)))]
pub async fn admin_create_api_key() {}

#[utoipa::path(delete, path = "/admin/api-keys/{id}", tag = "Admin API Keys", security(("bearer_auth" = [])),
    params(("id" = String, Path)),
    responses((status = 200, description = "API key deleted")))]
pub async fn admin_delete_api_key() {}

#[utoipa::path(put, path = "/admin/api-keys/{id}/activate", tag = "Admin API Keys", security(("bearer_auth" = [])),
    params(("id" = String, Path)),
    responses((status = 200, description = "API key activated")))]
pub async fn admin_activate_api_key() {}

// ── Admin AI Config ──

#[utoipa::path(get, path = "/admin/ai-config", tag = "Admin AI Config", security(("bearer_auth" = [])),
    responses((status = 200, description = "List AI configs")))]
pub async fn admin_list_ai_configs() {}

#[utoipa::path(put, path = "/admin/ai-config/{key}", tag = "Admin AI Config", security(("bearer_auth" = [])),
    params(("key" = String, Path, description = "Config key")),
    responses((status = 200, description = "Config updated")))]
pub async fn admin_update_ai_config() {}

#[utoipa::path(get, path = "/admin/evaluation-weights", tag = "Admin AI Config", security(("bearer_auth" = [])),
    responses((status = 200, description = "Evaluation weights")))]
pub async fn admin_get_eval_weights() {}

#[utoipa::path(put, path = "/admin/evaluation-weights", tag = "Admin AI Config", security(("bearer_auth" = [])),
    responses((status = 200, description = "Weights updated")))]
pub async fn admin_update_eval_weights() {}

#[utoipa::path(get, path = "/admin/ai-prompts", tag = "Admin AI Config", security(("bearer_auth" = [])),
    responses((status = 200, body = Vec<AIPromptConfig>)))]
pub async fn admin_get_ai_prompts() {}

#[utoipa::path(put, path = "/admin/ai-prompts/{entity_type}", tag = "Admin AI Config", security(("bearer_auth" = [])),
    params(("entity_type" = String, Path)),
    request_body = UpdatePromptRequest,
    responses((status = 200, description = "Prompt updated")))]
pub async fn admin_update_ai_prompt() {}

// ── Admin Gamification ──

#[utoipa::path(get, path = "/admin/gamification", tag = "Admin Gamification", security(("bearer_auth" = [])),
    responses((status = 200, description = "Gamification config")))]
pub async fn admin_get_gamification() {}

#[utoipa::path(put, path = "/admin/gamification", tag = "Admin Gamification", security(("bearer_auth" = [])),
    responses((status = 200, description = "Config updated")))]
pub async fn admin_update_gamification() {}

#[utoipa::path(get, path = "/admin/speaking/sessions", tag = "Admin AI", security(("bearer_auth" = [])),
    responses((status = 200, description = "List all speaking sessions")))]
pub async fn admin_list_speaking_sessions() {}

// ── Admin Games ──

#[utoipa::path(get, path = "/admin/games", tag = "Admin Games", security(("bearer_auth" = [])),
    responses((status = 200, description = "List games")))]
pub async fn admin_list_games() {}

#[utoipa::path(post, path = "/admin/games", tag = "Admin Games", security(("bearer_auth" = [])),
    responses((status = 201, description = "Game created")))]
pub async fn admin_create_game() {}

#[utoipa::path(put, path = "/admin/games/{id}", tag = "Admin Games", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Game ID")),
    responses((status = 200, description = "Game updated")))]
pub async fn admin_update_game() {}

#[utoipa::path(delete, path = "/admin/games/{id}", tag = "Admin Games", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Game ID")),
    responses((status = 200, description = "Game deleted")))]
pub async fn admin_delete_game() {}

// ── Admin Ratings ──

#[utoipa::path(get, path = "/admin/ratings", tag = "Admin Ratings", security(("bearer_auth" = [])),
    responses((status = 200, description = "List ratings")))]
pub async fn admin_list_ratings() {}

// ── Admin Monetization ──

#[utoipa::path(get, path = "/admin/features", tag = "Admin Monetization", security(("bearer_auth" = [])),
    responses((status = 200, description = "List feature flags")))]
pub async fn admin_list_features() {}

#[utoipa::path(put, path = "/admin/features/{name}", tag = "Admin Monetization", security(("bearer_auth" = [])),
    params(("name" = String, Path, description = "Feature name")),
    responses((status = 200, description = "Feature updated")))]
pub async fn admin_update_feature() {}

#[utoipa::path(get, path = "/admin/monetization/config", tag = "Admin Monetization", security(("bearer_auth" = [])),
    responses((status = 200, description = "Monetization config")))]
pub async fn admin_get_monetization_config() {}

#[utoipa::path(put, path = "/admin/monetization/config", tag = "Admin Monetization", security(("bearer_auth" = [])),
    responses((status = 200, description = "Config updated")))]
pub async fn admin_update_monetization_config() {}

// ── Public Content ──

#[utoipa::path(get, path = "/api/recommendations", tag = "Public Content", security(("bearer_auth" = [])),
    responses((status = 200, description = "Personalized recommendations")))]
pub async fn public_recommendations() {}

#[utoipa::path(get, path = "/api/courses", tag = "Public Content",
    responses((status = 200, description = "Published courses")))]
pub async fn public_list_courses() {}

#[utoipa::path(get, path = "/api/courses/{id}/modules", tag = "Public Content",
    params(("id" = String, Path, description = "Course ID")),
    responses((status = 200, description = "Course modules")))]
pub async fn public_list_modules() {}

#[utoipa::path(get, path = "/api/modules/{id}/lessons", tag = "Public Content",
    params(("id" = String, Path, description = "Module ID")),
    responses((status = 200, description = "Module lessons")))]
pub async fn public_list_lessons() {}

#[utoipa::path(get, path = "/api/lessons/{id}", tag = "Public Content",
    params(("id" = String, Path, description = "Lesson ID")),
    responses((status = 200, description = "Lesson detail with vocabulary, dialogues & quizzes")))]
pub async fn public_get_lesson() {}

#[utoipa::path(get, path = "/api/lessons/{id}/games", tag = "Public Content",
    params(("id" = String, Path, description = "Lesson ID")),
    responses((status = 200, description = "Games for this lesson")))]
pub async fn public_list_lesson_games() {}

#[utoipa::path(get, path = "/api/scenarios", tag = "Public Content",
    responses((status = 200, description = "Active interview scenarios")))]
pub async fn public_list_scenarios() {}

#[utoipa::path(get, path = "/api/scenarios/{id}", tag = "Public Content",
    params(("id" = String, Path, description = "Scenario ID")),
    responses((status = 200, description = "Scenario detail")))]
pub async fn public_get_scenario() {}

// ── Public Interviews ──

#[utoipa::path(post, path = "/api/interviews/{scenario_id}/start", tag = "Public Interviews", security(("bearer_auth" = [])),
    params(("scenario_id" = String, Path, description = "Scenario ID")),
    responses((status = 201, description = "Interview session started")))]
pub async fn public_start_interview() {}

#[utoipa::path(post, path = "/api/interviews/sessions/{session_id}/chat", tag = "Public Interviews", security(("bearer_auth" = [])),
    params(("session_id" = String, Path, description = "Session ID")),
    responses((status = 200, description = "AI reply")))]
pub async fn public_send_chat() {}

#[utoipa::path(post, path = "/api/interviews/sessions/{session_id}/complete", tag = "Public Interviews", security(("bearer_auth" = [])),
    params(("session_id" = String, Path, description = "Session ID")),
    responses((status = 200, description = "Interview completed with scores")))]
pub async fn public_complete_interview() {}

// ── Progress ──

#[utoipa::path(get, path = "/progress", tag = "Progress", security(("bearer_auth" = [])),
    responses((status = 200, description = "User progress")))]
pub async fn get_progress() {}

#[utoipa::path(post, path = "/progress/xp", tag = "Progress", security(("bearer_auth" = [])),
    responses((status = 200, description = "XP added")))]
pub async fn add_xp() {}

#[utoipa::path(post, path = "/progress/quiz", tag = "Progress", security(("bearer_auth" = [])),
    responses((status = 200, description = "Quiz submitted")))]
pub async fn submit_quiz() {}

#[utoipa::path(post, path = "/progress/game", tag = "Progress", security(("bearer_auth" = [])),
    responses((status = 200, description = "Game result submitted")))]
pub async fn submit_game_result() {}

#[utoipa::path(post, path = "/progress/speaking", tag = "Progress", security(("bearer_auth" = [])),
    responses((status = 200, description = "Speaking result submitted")))]
pub async fn submit_speaking_result() {}

// ── Game Sessions ──

#[utoipa::path(post, path = "/progress/session/start", tag = "Game Sessions", security(("bearer_auth" = [])),
    request_body = GameSessionStartRequest,
    responses((status = 201, description = "Session started")))]
pub async fn start_game_session() {}

#[utoipa::path(post, path = "/progress/session/answer", tag = "Game Sessions", security(("bearer_auth" = [])),
    request_body = GameAnswerRequest,
    responses((status = 200, description = "Answer processed")))]
pub async fn submit_game_answer() {}

#[utoipa::path(post, path = "/progress/session/sync", tag = "Game Sessions", security(("bearer_auth" = [])),
    request_body = OfflineSyncRequest,
    responses((status = 200, description = "Offline sessions synced")))]
pub async fn sync_offline_sessions() {}

#[utoipa::path(post, path = "/progress/voice/score", tag = "Game Sessions", security(("bearer_auth" = [])),
    request_body = VoiceScoreRequest,
    responses((status = 200, body = VoiceScoreResponse)))]
pub async fn score_pronunciation() {}

// ── Student Vocab ──

#[utoipa::path(get, path = "/api/student/vocab-sets", tag = "Student Vocab", security(("bearer_auth" = [])),
    responses((status = 200, body = Vec<VocabSet>)))]
pub async fn student_list_vocab_sets() {}

#[utoipa::path(get, path = "/api/student/vocab-sets/{id}/words", tag = "Student Vocab", security(("bearer_auth" = [])),
    params(("id" = String, Path)),
    responses((status = 200, body = Vec<VocabWord>)))]
pub async fn student_get_vocab_words() {}

#[utoipa::path(post, path = "/api/student/vocab-progress", tag = "Student Vocab", security(("bearer_auth" = [])),
    request_body = StudentVocabProgressRequest,
    responses((status = 200, description = "Progress submitted")))]
pub async fn student_submit_vocab_progress() {}

#[utoipa::path(put, path = "/api/student/vocab/{word_id}/bookmark", tag = "Student Vocab", security(("bearer_auth" = [])),
    params(("word_id" = String, Path)),
    responses((status = 200, description = "Bookmark toggled")))]
pub async fn student_toggle_bookmark() {}

#[utoipa::path(get, path = "/api/student/bookmarks", tag = "Student Vocab", security(("bearer_auth" = [])),
    responses((status = 200, body = Vec<VocabWord>)))]
pub async fn student_get_bookmarks() {}

#[utoipa::path(get, path = "/api/student/conversation-requests", tag = "Student Vocab", security(("bearer_auth" = [])),
    responses((status = 200, body = Vec<ConversationRequest>)))]
pub async fn student_list_conversation_requests() {}

#[utoipa::path(post, path = "/api/student/conversation-requests", tag = "Student Vocab", security(("bearer_auth" = [])),
    responses((status = 201, description = "Request created")))]
pub async fn student_create_conversation_request() {}

// ── Speaking Practice ──

#[utoipa::path(post, path = "/progress/speaking/sessions/start", tag = "Game Sessions", security(("bearer_auth" = [])),
    responses((status = 201, description = "Session started")))]
pub async fn speaking_start_session() {}

#[utoipa::path(post, path = "/progress/speaking/sessions/{id}/turn", tag = "Game Sessions", security(("bearer_auth" = [])),
    params(("id" = String, Path)),
    responses((status = 200, description = "Turn processed")))]
pub async fn speaking_session_turn() {}

#[utoipa::path(post, path = "/progress/speaking/sessions/{id}/end", tag = "Game Sessions", security(("bearer_auth" = [])),
    params(("id" = String, Path)),
    responses((status = 200, description = "Session ended")))]
pub async fn speaking_end_session() {}

#[utoipa::path(get, path = "/admin/vocab-sets", tag = "Admin Content", security(("bearer_auth" = [])),
    responses((status = 200, body = Vec<VocabSet>)))]
pub async fn admin_list_vocab_sets() {}

#[utoipa::path(get, path = "/admin/vocab-sets/{id}/words", tag = "Admin Content", security(("bearer_auth" = [])),
    params(("id" = String, Path)),
    responses((status = 200, body = Vec<VocabWord>)))]
pub async fn admin_get_vocab_words() {}

// ── Ratings ──

#[utoipa::path(post, path = "/ratings/lessons", tag = "Ratings", security(("bearer_auth" = [])),
    responses((status = 200, description = "Rating submitted")))]
pub async fn submit_lesson_rating() {}

// ── Notifications ──

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct NotificationRequestPublic {
    pub user_id: Option<String>,
    pub title: String,
    pub message: String,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct NotificationPublic {
    pub id: String,
    pub user_id: Option<String>,
    pub title: String,
    pub message: String,
    pub is_read: bool,
    pub created_at: String,
}

#[utoipa::path(post, path = "/admin/notifications", tag = "Notifications", security(("bearer_auth" = [])),
    request_body = NotificationRequestPublic,
    responses((status = 201, description = "Notification sent", body = NotificationPublic)))]
pub async fn admin_send_notification() {}

#[utoipa::path(get, path = "/api/notifications", tag = "Notifications", security(("bearer_auth" = [])),
    params(PaginationParams),
    responses((status = 200, description = "List user notifications")))]
pub async fn list_notifications() {}

#[utoipa::path(put, path = "/api/notifications/{id}/read", tag = "Notifications", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Notification ID")),
    responses((status = 200, description = "Notification marked as read")))]
pub async fn mark_notification_read() {}

// ── Voice ──

#[utoipa::path(get, path = "/admin/voice/config", tag = "Voice", security(("bearer_auth" = [])),
    responses((status = 200, body = VoiceConfig)))]
pub async fn admin_get_voice_config() {}

#[utoipa::path(put, path = "/admin/voice/config", tag = "Voice", security(("bearer_auth" = [])),
    request_body = VoiceConfig,
    responses((status = 200, description = "Voice config updated")))]
pub async fn admin_update_voice_config() {}

#[utoipa::path(post, path = "/voice/stt", tag = "Voice", security(("bearer_auth" = [])),
    responses((status = 200, body = SpeechToTextResponse)))]
pub async fn voice_stt() {}

#[utoipa::path(post, path = "/voice/tts", tag = "Voice", security(("bearer_auth" = [])),
    responses((status = 200, body = TextToSpeechResponse)))]
pub async fn voice_tts() {}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub enum Role { Admin, SuperAdmin }

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct GenerateCourseRequest {
    pub topic: String,
    pub level: String,
    pub category: String,
    pub skill_focus: Option<Vec<String>>,
    pub target_age: Option<String>,
    pub num_modules: Option<i32>,
    pub lessons_per_module: Option<i32>,
    pub vocab_per_lesson: Option<i32>,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct SaveCourseRequest {
    pub preview_json: serde_json::Value,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct GenerateVocabRequest {
    pub topic: String,
    pub level: String,
    pub target_language: Option<String>,
    pub word_count: Option<i32>,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct AiGenerationLog {
    pub id: String,
    pub admin_id: String,
    pub action: String,
    pub provider: String,
    pub total_tokens: i64,
    pub estimated_cost_usd: f64,
    pub status: String,
    pub created_at: String,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct CreditUsageSummary {
    pub today_count: i64,
    pub month_count: i64,
    pub today_cost_usd: f64,
    pub month_cost_usd: f64,
    pub daily_limit: i64,
    pub daily_remaining: i64,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct LlmApiKey {
    pub id: String,
    pub provider: String,
    pub name: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct CreateLlmApiKeyRequest {
    pub provider: String,
    pub name: String,
    pub api_key: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct TranslateRequest {
    pub text: String,
    pub to: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct AiGenerateRequest {
    pub entity_type: String,
    pub context: Option<String>,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct AIPromptConfig {
    pub entity_type: String,
    pub prompt_template: String,
    pub updated_at: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct UpdatePromptRequest {
    pub prompt_template: String,
}

#[derive(utoipa::ToSchema, serde::Serialize, serde::Deserialize)]
pub struct DialogueLine {
    pub speaker: String,
    pub text_en: String,
    pub text_id: Option<String>,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub enum SkillType { Speaking, Listening, Reading, Writing, Grammar, Vocabulary, Pronunciation }
#[derive(utoipa::ToSchema, serde::Serialize)]
pub enum ContentLevel { A1, A2, B1, B2, C1, C2 }
#[derive(utoipa::ToSchema, serde::Serialize)]
pub enum ContentCategory { Restaurant, Hotel, Cruise, Interview, General, Business, Travel }
#[derive(utoipa::ToSchema, serde::Serialize)]
pub enum CourseStatus { Draft, Published, InReview, Archived }
#[derive(utoipa::ToSchema, serde::Serialize)]
pub enum TargetAge { Kids, Teens, Adults, All }
#[derive(utoipa::ToSchema, serde::Serialize)]
pub enum Visibility { Public, Private, Unlisted }

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct VoiceConfig {
    pub provider: String,
    pub voice_id: String,
    pub speed: f32,
    pub pitch: f32,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct SpeechToTextResponse {
    pub text: String,
    pub confidence: f32,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct TextToSpeechResponse {
    pub audio_url: String,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct VocabSet {
    pub id: String,
    pub title: String,
    pub topic: String,
    pub level: String,
    pub word_count: i32,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct VocabWord {
    pub id: String,
    pub word: String,
    pub translation: String,
    pub definition: String,
    pub example_sentence: String,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct ConversationRequest {
    pub id: String,
    pub user_id: String,
    pub status: String,
    pub context_note: String,
    pub created_at: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct StudentVocabProgressRequest {
    pub word_id: String,
    pub status: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct GameSessionStartRequest {
    pub game_id: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct GameAnswerRequest {
    pub session_id: String,
    pub answer: serde_json::Value,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct VoiceScoreRequest {
    pub audio_base64: String,
    pub reference_text: String,
}

#[derive(utoipa::ToSchema, serde::Serialize)]
pub struct VoiceScoreResponse {
    pub score: f32,
    pub feedback: String,
}

#[derive(utoipa::ToSchema, serde::Deserialize)]
pub struct OfflineSyncRequest {
    pub answers: serde_json::Value,
}
