pub mod admin;
pub mod ai;
pub mod auth;
pub mod content;
pub mod game;
pub mod handlers;
pub mod interview;
pub mod middleware;
pub mod models;
pub mod monetization;
pub mod notification;
pub mod progress;
pub mod rating;
pub mod seed;
pub mod speaking;
pub mod swagger;
pub mod vocab;
pub mod voice;

use crate::admin::handlers::{
    admin_login, admin_me, delete_user, get_user, list_users, upload_asset,
};
use crate::ai::handlers::{
    fulfill_conversation_request, generate_course, generate_vocab, get_credit_usage,
    list_conversation_requests, save_course,
};
use crate::content::handlers::*;
use crate::game::handlers::*;
use crate::game::session_handlers::*;
use crate::game::voice_scoring::score_pronunciation;
use crate::handlers::{
    AppState, firebase_login, get_me, login, register, update_fcm_token, update_onboarding,
    update_profile, upload_profile_image,
};
use crate::interview::handlers::*;
use crate::interview::session_handlers::*;
use crate::monetization::handlers::*;
use crate::notification::handlers::{
    list_notifications, mark_notification_read, send_notification,
};
use crate::progress::handlers::*;
use crate::rating::handlers::*;
use crate::seed::seed_admin;
use crate::speaking::handlers as speaking_handlers;
use crate::swagger::ApiDoc;
use crate::voice::handlers::{
    get_voice_config, speech_to_text, text_to_speech, update_voice_config,
};
use axum::{
    Router,
    routing::{delete, get, post, put},
};
use mongodb::Client;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

pub async fn create_app() -> Router {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let client = Client::with_uri_str(&database_url)
        .await
        .expect("Failed to initialize MongoDB client");

    // Map FIREBASE_SERVICE_ACCOUNT_JSON to GOOGLE_APPLICATION_CREDENTIALS_JSON if needed
    if let Ok(json) = std::env::var("FIREBASE_SERVICE_ACCOUNT_JSON") {
        unsafe {
            std::env::set_var("GOOGLE_APPLICATION_CREDENTIALS_JSON", json);
        }
    }

    // Seed default admin on startup
    seed_admin(&client).await;

    // Seed default learning content
    crate::seed::seed_content(&client).await;

    let state = Arc::new(AppState {
        db: client,
        jwt_secret,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // ============ Admin Routes (protected by Admin extractor) ============

    let admin_routes = Router::new()
        // Diagnostics
        .route("/ping", get(|| async { "Admin API is reachable" }))
        // AI Generation (High priority routes)
        .route("/ai/generate-course", post(generate_course))
        .route("/ai/save-course", post(save_course))
        .route("/ai/generate-vocab", post(generate_vocab))
        .route("/ai/save-vocab", post(vocab::handlers::save_vocab_set))
        .route("/ai/credit-usage", get(get_credit_usage))
        // Auth
        .route("/login", post(admin_login))
        .route("/me", get(admin_me))
        // User management
        .route("/users", get(list_users))
        .route("/users/:id", get(get_user).delete(delete_user))
        // Content CMS
        .route("/courses", get(list_courses).post(create_course))
        .route(
            "/courses/:id",
            get(get_course).put(update_course).delete(delete_course),
        )
        .route("/modules", get(list_modules).post(create_module))
        .route("/modules/:id", put(update_module).delete(delete_module))
        .route("/lessons", get(list_lessons).post(create_lesson))
        .route("/lessons/:id", put(update_lesson).delete(delete_lesson))
        .route("/vocabulary", get(list_vocabulary).post(create_vocabulary))
        .route(
            "/vocabulary/:id",
            get(get_vocabulary)
                .put(update_vocabulary)
                .delete(delete_vocabulary),
        )
        .route("/dialogues", get(list_dialogues).post(create_dialogue))
        .route(
            "/dialogues/:id",
            get(get_dialogue)
                .put(update_dialogue)
                .delete(delete_dialogue),
        )
        .route("/quizzes", get(list_quizzes).post(create_quiz))
        .route(
            "/quizzes/:id",
            get(get_quiz).put(update_quiz).delete(delete_quiz),
        )
        // Interview Scenario Manager
        .route("/scenarios", get(list_scenarios).post(create_scenario))
        .route(
            "/scenarios/:id",
            get(get_scenario)
                .put(update_scenario)
                .delete(delete_scenario),
        )
        .route("/questions", post(add_question))
        .route("/questions/:id", delete(delete_question))
        // AI Config
        .route("/ai-config", get(list_ai_configs))
        .route("/ai-config/:key", put(update_ai_config))
        // Evaluation Weights
        .route(
            "/evaluation-weights",
            get(get_evaluation_weights).put(update_evaluation_weights),
        )
        // Gamification Config
        .route(
            "/gamification",
            get(get_gamification_config).put(update_gamification_config),
        )
        // Game Engine
        .route("/games", get(list_games).post(create_game))
        .route("/games/:id", put(update_game).delete(delete_game))
        // Ratings
        .route("/ratings", get(list_ratings))
        // Monetization & Feature Access
        .route("/features", get(list_features))
        .route("/features/:name", put(update_feature))
        .route(
            "/monetization/config",
            get(get_monetization_config).put(update_monetization_config),
        )
        // Notifications
        .route("/notifications", post(send_notification))
        // Assets
        .route("/assets/upload", post(upload_asset))
        // LLM API Key Management
        .route("/api-keys", get(list_api_keys).post(create_api_key))
        .route("/api-keys/:id", delete(delete_api_key))
        .route("/api-keys/:id/activate", put(activate_api_key))
        // AI Translation & Generation
        .route("/translate", post(translate_text))
        .route("/ai-generate", post(ai_generate_content))
        // Content Version History
        .route(
            "/versions/:entity_type/:entity_id",
            get(list_content_versions),
        )
        .route(
            "/versions/:entity_type/:entity_id/rollback/:version",
            post(rollback_content_version),
        )
        // Clone
        .route("/clone/:entity_type/:entity_id", post(clone_content))
        // AI Prompt Templates
        .route("/ai-prompts", get(get_ai_prompts))
        .route("/ai-prompts/:entity_type", put(update_ai_prompt))
        .route("/vocab-sets", get(vocab::handlers::list_vocab_sets))
        .route(
            "/vocab-sets/:id/words",
            get(vocab::handlers::get_vocab_words),
        )
        // Conversation Requests
        .route("/conversation-requests", get(list_conversation_requests))
        .route(
            "/conversation-requests/:id/generate",
            post(fulfill_conversation_request),
        )
        // Voice Config
        .route(
            "/voice/config",
            get(get_voice_config).put(update_voice_config),
        )
        // Speaking Monitor
        .route(
            "/speaking/sessions",
            get(speaking_handlers::list_all_sessions),
        );

    // ============ Voice Abstraction Routes (auth recommended) ============
    let voice_routes = Router::new()
        .route("/stt", post(speech_to_text))
        .route("/tts", post(text_to_speech));

    // ============ Public API Routes (for mobile app) ============

    let public_content_routes = Router::new()
        .route("/recommendations", get(public_recommendations))
        .route("/courses", get(public_list_courses))
        .route("/courses/:id/modules", get(public_list_modules))
        .route("/modules/:id/lessons", get(public_list_lessons))
        .route("/lessons/:id", get(public_get_lesson))
        .route("/lessons/:id/games", get(public_list_lesson_games))
        .route("/scenarios", get(public_list_scenarios))
        .route("/scenarios/:id", get(public_get_scenario))
        // AI Interview Session (needs User Auth)
        .route(
            "/interviews/:scenario_id/start",
            post(start_interview_session),
        )
        .route(
            "/interviews/sessions/:session_id/chat",
            post(send_chat_message),
        )
        .route(
            "/interviews/sessions/:session_id/complete",
            post(complete_interview_session),
        )
        // Notifications
        .route("/notifications", get(list_notifications))
        .route("/notifications/:id/read", put(mark_notification_read));

    // ============ User Progress Routes (auth required) ============

    let progress_routes = Router::new()
        .route("/", get(get_progress))
        .route("/xp", post(add_xp))
        .route("/quiz", post(submit_quiz))
        .route("/game", post(submit_game_result))
        .route("/speaking", post(submit_speaking_result))
        // Game Engine Session Routes
        .route("/session/start", post(start_session))
        .route("/session/answer", post(submit_answer))
        .route("/session/sync", post(sync_offline_sessions))
        // Speaking Practice Session API
        .route(
            "/speaking/sessions/start",
            post(speaking_handlers::start_session),
        )
        .route(
            "/speaking/sessions/:id/turn",
            post(speaking_handlers::session_turn),
        )
        .route(
            "/speaking/sessions/:id/end",
            post(speaking_handlers::end_session),
        )
        // Voice Star Scoring
        .route("/voice/score", post(score_pronunciation));

    // ============ Rating Routes (auth required) ============

    let rating_routes = Router::new().route("/lessons", post(submit_lesson_rating));

    // ============ Student Vocab Routes (auth required) ============

    let student_vocab_routes = Router::new()
        .route(
            "/vocab-sets",
            get(vocab::student_handlers::get_published_sets),
        )
        .route(
            "/vocab-sets/:id/words",
            get(vocab::student_handlers::get_set_words),
        )
        .route(
            "/vocab-progress",
            post(vocab::student_handlers::submit_progress),
        )
        .route(
            "/vocab/:word_id/bookmark",
            put(vocab::student_handlers::toggle_bookmark),
        )
        .route("/bookmarks", get(vocab::student_handlers::get_bookmarks))
        .route(
            "/conversation-requests",
            get(vocab::student_handlers::list_my_requests)
                .post(vocab::student_handlers::create_conversation_request),
        );

    Router::new()
        .route("/", get(root))
        // Swagger UI
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        // Auth
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/firebase", post(firebase_login))
        .route("/auth/me", get(get_me))
        .route("/auth/onboarding", put(update_onboarding))
        .route("/auth/profile", put(update_profile))
        .route("/auth/profile-image", post(upload_profile_image))
        .route("/auth/fcm-token", put(update_fcm_token))
        // Admin panel
        .nest("/admin", admin_routes)
        // Public content
        .nest("/api", public_content_routes)
        // Student vocab
        .nest("/api/student", student_vocab_routes)
        // User progress
        .nest("/progress", progress_routes)
        // User ratings
        .nest("/ratings", rating_routes)
        // Voice Proxy
        .nest("/voice", voice_routes)
        .layer(cors)
        .with_state(state)
}

async fn root() -> &'static str {
    "Welcome to the Hospitality English Learning API! 🏨✈️🚢"
}
