pub mod analytics;
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
pub mod session;
pub mod speaking;
pub mod speaking_ai;
pub mod speakup;
pub mod swagger;
pub mod vocab;
pub mod voice;
pub mod ebook;
pub mod storage;
pub mod video_drill;

use crate::admin::handlers::{
    admin_login, admin_me, delete_user, get_user, list_users, upload_asset, get_dashboard_stats, update_user,
    update_admin_me, list_master_data, get_master_data, update_master_data,
};
use crate::ai::handlers::{
    fulfill_conversation_request, generate_course, generate_vocab, get_credit_usage,
    list_conversation_requests, save_course, enrich_vocab_word,
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
    list_admin_notifications, mark_admin_notification_read,
};
use crate::progress::handlers::*;
use crate::rating::handlers::*;
use crate::seed::seed_admin;
use crate::speaking::handlers as speaking_handlers;
use crate::speaking_ai::handlers::{
    voice_chat, text_chat, transcribe_only, tts_only,
};
use crate::session::handlers as session_handlers;
use crate::speakup::handlers as speakup_handlers;
use crate::swagger::ApiDoc;
use crate::voice::handlers::{
    get_voice_config, speech_to_text, text_to_speech, update_voice_config,
};
use crate::storage::{
    get_storage_config, update_storage_config, get_storage_capacity,
};
use crate::video_drill::handlers as video_drill_handlers;
// Removed duplicate/glob speaking import to resolve ambiguity
use axum::{
    routing::{delete, get, post, put, patch},
    Router,
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

    // Seed default master data
    crate::seed::seed_master_data(&client).await;

    // Seed default learning content
    crate::seed::seed_content(&client).await;
    crate::seed::seed_speaking_scenarios(&client).await;
    crate::seed::seed_api_keys(&client).await;
    crate::seed::seed_phrasal_verbs(&client).await;
    crate::seed::seed_speakup_content(&client).await;
    crate::seed::seed_level_templates(&client).await;
    crate::seed::seed_curriculum(&client).await;

    let state = Arc::new(AppState {
        db: client,
        jwt_secret,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // ============ SpeakUp Routes ============
    let speakup_routes: Router<Arc<AppState>> = Router::new()
        // Admin / shared content management
        .route("/content", get(speakup_handlers::speakup_list_content).post(speakup_handlers::speakup_create_content))
        .route("/content/:id", get(speakup_handlers::speakup_get_content).put(speakup_handlers::speakup_update_content).delete(speakup_handlers::speakup_delete_content))
        // Student attempt (existing)
        .route("/analyze", post(speakup_handlers::speakup_analyze_attempt))
        // Admin test endpoints
        .route("/test-analyze", post(speakup_handlers::speakup_admin_test_analyze))
        .route("/test-listen", post(speakup_handlers::speakup_admin_test_listen))
        .route("/ai-generate", post(speakup_handlers::speakup_ai_generate_content))
        // ── Mobile-first endpoints (user-authenticated) ──────────────
        // GET  /speakup/mobile/content?type=shadowing&difficulty=A1
        .route("/mobile/content", get(speakup_handlers::mobile_list_speakup))
        // POST /speakup/mobile/listen          → base64 MP3 reference audio
        .route("/mobile/listen", post(speakup_handlers::mobile_speakup_listen))
        // POST /speakup/mobile/attempt         → STT + analysis + Groq feedback + feedback audio
        .route("/mobile/attempt", post(speakup_handlers::mobile_speakup_attempt))
        // POST /speakup/mobile/expansion/step  → per-step expansion drill
        .route("/mobile/expansion/step", post(speakup_handlers::mobile_expansion_step))
        // GET  /speakup/mobile/history         → last 20 sessions
        .route("/mobile/history", get(speakup_handlers::mobile_speakup_history));

    // ============ Admin Routes (protected by Admin extractor) ============
    let admin_routes = Router::new()
        // Diagnostics
        .route("/ping", get(|| async { "Admin API is reachable" }))
        // AI Generation (High priority routes)
        .route("/ai/generate-course", post(generate_course))
        .route("/ai/save-course", post(save_course))
        .route("/ai/generate-vocab", post(generate_vocab))
        .route("/ai/enrich-word", post(enrich_vocab_word))
        .route("/ai/save-vocab", post(vocab::handlers::save_vocab_set))
        .route("/ai/credit-usage", get(get_credit_usage))
        // Auth
        .route("/login", post(admin_login))
        .route("/me", get(admin_me).put(update_admin_me))
        .route("/dashboard/stats", get(get_dashboard_stats))
        // User management
        .route("/users", get(list_users))
        .route("/users/:id", get(get_user).put(update_user).delete(delete_user))
        // Content CMS
        .route("/courses", get(list_courses).post(create_course))
        .route(
            "/courses/:id",
            get(get_course).put(update_course).delete(delete_course),
        )
        .route("/courses/:id/path", get(get_course_path))
        .route("/modules", get(list_modules).post(create_module))
        .route("/modules/reorder", patch(reorder_modules))
        .route("/modules/:id", put(update_module).delete(delete_module))
        .route("/lessons", get(list_lessons).post(create_lesson))
        .route("/lessons/reorder", patch(reorder_lessons))
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
        .route("/notifications", get(list_admin_notifications).post(send_notification))
        .route("/notifications/:id/read", put(mark_admin_notification_read))
        // Analytics
        .route("/analytics", get(crate::analytics::handlers::list_events))
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
            "/vocab-sets/:id", 
            get(vocab::handlers::get_vocab_words)
                .put(vocab::handlers::update_vocab_set)
                .delete(vocab::handlers::delete_vocab_set)
        )
        .route(
            "/vocab-sets/:id/words",
            get(vocab::handlers::get_vocab_words),
        )
        .route(
            "/vocab-sets/:id/words/:word_id",
            put(vocab::handlers::update_vocab_word).delete(vocab::handlers::delete_vocab_word),
        )
        // Conversation Requests
        .route("/conversation-requests", get(list_conversation_requests))
        .route(
            "/conversation-requests/:id/generate",
            post(fulfill_conversation_request),
        )
        // Vocab Groups
        .route("/vocab-groups", get(vocab::handlers::list_vocab_groups).post(vocab::handlers::create_vocab_group))
        .route(
            "/vocab-groups/:id",
            get(vocab::handlers::get_vocab_group)
                .put(vocab::handlers::update_vocab_group)
                .delete(vocab::handlers::delete_vocab_group)
        )
        .route(
            "/vocab-groups/:id/words",
            get(vocab::handlers::get_vocab_group_words)
        )
        // Master Data
        .route("/master-data", get(list_master_data))
        .route("/master-data/:category", get(get_master_data).put(update_master_data))
        // Voice Config
        .route(
            "/voice/config",
            get(get_voice_config).put(update_voice_config),
        )
        // Storage Config
        .route(
            "/storage/config",
            get(get_storage_config).put(update_storage_config),
        )
        .route(
            "/storage/capacity",
            get(get_storage_capacity),
        )
        // Voice Proxy (Admin-protected access)
        .route("/voice/stt", post(speech_to_text))
        .route("/voice/tts", post(text_to_speech))
        // SpeakUp Management
        .nest("/speakup", speakup_routes.clone())
        // Session Templates & Configs
        .route("/level-templates", get(session_handlers::list_level_templates))
        .route("/level-templates/:level", get(session_handlers::get_level_template).put(session_handlers::update_level_template))
        .route("/lesson-configs", get(session_handlers::list_lesson_configs))
        .route("/lesson-configs/:lesson_id", get(session_handlers::get_lesson_config).put(session_handlers::upsert_lesson_config).delete(session_handlers::delete_lesson_config))
        // Ebook Reference & Generation
        .route("/books", get(crate::ebook::list_books).post(crate::ebook::upload_book))
        .route("/curriculum", get(crate::ebook::get_curriculum))
        .route("/ebook/generate", post(crate::ebook::generate_ebook))
        .route("/ebook/:id", get(crate::ebook::get_ebook).put(crate::ebook::update_ebook))
        .route("/ebook/:id/export", post(crate::ebook::export_ebook))
        // Video Drills
        .route("/video-drills", get(video_drill_handlers::list_video_drills).post(video_drill_handlers::create_video_drill))
        .route("/video-drills/:id", get(video_drill_handlers::get_video_drill).put(video_drill_handlers::update_video_drill).delete(video_drill_handlers::delete_video_drill));

    // ============ Voice Abstraction Routes (auth recommended) ============
    let voice_routes = Router::new()
        .route("/stt", post(speech_to_text))
        .route("/tts", post(text_to_speech));

    // ============ Public API Routes (for mobile app) ============

    let public_content_routes = Router::new()
        .route("/recommendations", get(public_recommendations))
        .route("/courses", get(public_list_courses))
        .route("/courses/:id/path", get(get_course_path))
        .route("/courses/:id/modules", get(public_list_modules))
        .route("/modules/:id/lessons", get(public_list_lessons))
        .route("/lessons/:id", get(public_get_lesson))
        .route("/lessons/:id/session", get(session_handlers::get_lesson_session))
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
        .route("/notifications/:id/read", put(mark_notification_read))
        // Analytics
        .route("/analytics/track", post(crate::analytics::handlers::track_event));

    // ============ User Progress Routes (auth required) ============

    let progress_routes = Router::new()
        .route("/", get(get_progress))
        .route("/leaderboard", get(get_leaderboard))
        .route("/xp", post(add_xp))
        .route("/quiz", post(submit_quiz))
        .route("/game", post(submit_game_result))
        .route("/speaking", post(submit_speaking_result))
        .route("/speaking/scenarios", get(speaking_handlers::list_all_scenarios))
        // Game Engine Session Routes
        .route("/session/start", post(crate::game::session_handlers::start_session))
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
            "/vocab-groups",
            get(vocab::student_handlers::list_vocab_groups),
        )
        .route(
            "/vocab-groups/:id",
            get(vocab::student_handlers::get_vocab_group),
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
        )
        // Video Drills (student)
        .route("/video-drills/:id", get(video_drill_handlers::student_get_drill))
        .route("/video-drills/:id/submit", post(video_drill_handlers::student_submit_drill));

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
        .nest("/api/admin", admin_routes)
        .route("/api/admin/hello", get(|| async { "Hello from Speaking API!" }))
        // Explicit Speaking routes to bypass any potential shadowing
        .route("/api/admin/speaking/scenarios", get(speaking_handlers::admin_list_all_scenarios).post(speaking_handlers::create_speaking_scenario))
        .route(
            "/api/admin/speaking/scenarios/:id",
            get(speaking_handlers::get_speaking_scenario)
                .put(speaking_handlers::update_speaking_scenario)
                .delete(speaking_handlers::delete_speaking_scenario),
        )
        .route("/api/admin/speaking/scenarios/ai-generate", post(speaking_handlers::ai_generate_speaking_scenario))
        .route("/api/admin/speaking/test/start/:id", post(speaking_handlers::start_test_session))
        .route("/api/admin/speaking/test/turn/:id", post(speaking_handlers::test_session_turn))
        .route("/api/admin/speaking/sessions", get(speaking_handlers::list_all_sessions))
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
        // SpeakUp (Public access)
        .nest("/speakup", speakup_routes)
        // ── Speaking AI (mobile voice pipeline: STT → Groq → TTS) ──
        .route("/speaking-ai/chat", post(voice_chat))
        .route("/speaking-ai/text-chat", post(text_chat))
        .route("/speaking-ai/transcribe", post(transcribe_only))
        .route("/speaking-ai/tts", post(tts_only))
        .layer(cors)
        .with_state(state)
}

async fn root() -> &'static str {
    "Welcome to the Hospitality English Learning API! 🏨✈️🚢"
}
