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
        (name = "Admin Interviews", description = "Interview scenario & question management"),
        (name = "Admin AI Config", description = "AI prompt & evaluation weight configuration"),
        (name = "Admin Gamification", description = "Gamification & XP configuration"),
        (name = "Admin Games", description = "Game engine content management"),
        (name = "Admin Ratings", description = "View lesson ratings"),
        (name = "Admin Monetization", description = "Feature access & monetization config"),
        (name = "Public Content", description = "Public course/lesson browsing for mobile app"),
        (name = "Public Interviews", description = "AI interview sessions"),
        (name = "Progress", description = "User XP, quiz & game progress tracking"),
        (name = "Ratings", description = "User lesson ratings"),
    ),
    paths(
        // Auth
        crate::swagger::auth_register,
        crate::swagger::auth_login,
        crate::swagger::auth_me,
        crate::swagger::auth_onboarding,
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
        crate::swagger::admin_list_dialogues,
        crate::swagger::admin_create_dialogue,
        crate::swagger::admin_list_quizzes,
        crate::swagger::admin_create_quiz,
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
        // Ratings
        crate::swagger::submit_lesson_rating,
    ),
    components(schemas(
        // Generic
        ErrorResponse,
        // Auth schemas
        RegisterRequest, LoginRequest, OnboardingRequest, AuthResponse, UserPublic, Persona, Progress,
        // Admin
        AdminLoginRequest, AdminAuthResponse, AdminPublic,
        // Pagination
        PaginationParams,
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
pub struct OnboardingRequest {
    pub level: String,
    pub tone: String,
    pub goal: String,
    pub weakness: Option<String>,
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

#[utoipa::path(get, path = "/auth/me", tag = "Auth", security(("bearer_auth" = [])),
    responses((status = 200, body = UserPublic)))]
pub async fn auth_me() {}

#[utoipa::path(put, path = "/auth/onboarding", tag = "Auth", security(("bearer_auth" = [])),
    request_body = OnboardingRequest,
    responses((status = 200, body = UserPublic)))]
pub async fn auth_onboarding() {}

// ── Admin Auth ──

#[utoipa::path(post, path = "/admin/login", tag = "Admin Auth",
    request_body = AdminLoginRequest,
    responses((status = 200, body = AdminAuthResponse)))]
pub async fn admin_login() {}

#[utoipa::path(get, path = "/admin/me", tag = "Admin Auth", security(("bearer_auth" = [])),
    responses((status = 200, body = AdminPublic)))]
pub async fn admin_me() {}

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

#[utoipa::path(delete, path = "/admin/questions/{id}", tag = "Admin Interviews", security(("bearer_auth" = [])),
    params(("id" = String, Path, description = "Question ID")),
    responses((status = 200, description = "Question deleted")))]
pub async fn admin_delete_question() {}

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

// ── Admin Gamification ──

#[utoipa::path(get, path = "/admin/gamification", tag = "Admin Gamification", security(("bearer_auth" = [])),
    responses((status = 200, description = "Gamification config")))]
pub async fn admin_get_gamification() {}

#[utoipa::path(put, path = "/admin/gamification", tag = "Admin Gamification", security(("bearer_auth" = [])),
    responses((status = 200, description = "Config updated")))]
pub async fn admin_update_gamification() {}

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

// ── Ratings ──

#[utoipa::path(post, path = "/ratings/lessons", tag = "Ratings", security(("bearer_auth" = [])),
    responses((status = 200, description = "Rating submitted")))]
pub async fn submit_lesson_rating() {}
