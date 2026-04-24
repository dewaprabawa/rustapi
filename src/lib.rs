pub mod models;
pub mod swagger;
pub mod auth;
pub mod handlers;
pub mod middleware;
pub mod admin;
pub mod seed;
pub mod content;
pub mod interview;
pub mod progress;
pub mod game;
pub mod rating;
pub mod monetization;

use axum::{
    routing::{get, post, put, delete},
    Router,
};
use mongodb::Client;
use std::sync::Arc;
use crate::handlers::{AppState, register, login, get_me, update_onboarding};
use crate::admin::handlers::{admin_login, admin_me, list_users, get_user, delete_user};
use crate::content::handlers::*;
use crate::interview::handlers::*;
use crate::interview::session_handlers::*;
use crate::progress::handlers::*;
use crate::game::handlers::*;
use crate::rating::handlers::*;
use crate::monetization::handlers::*;
use crate::seed::seed_admin;
use tower_http::cors::{CorsLayer, Any};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;
use crate::swagger::ApiDoc;

pub async fn create_app() -> Router {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let client = Client::with_uri_str(&database_url)
        .await
        .expect("Failed to initialize MongoDB client");

    // Seed default admin on startup
    seed_admin(&client).await;

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
        // Auth
        .route("/login", post(admin_login))
        .route("/me", get(admin_me))
        // User management
        .route("/users", get(list_users))
        .route("/users/:id", get(get_user).delete(delete_user))
        // Content CMS
        .route("/courses", get(list_courses).post(create_course))
        .route("/courses/:id", get(get_course).put(update_course).delete(delete_course))
        .route("/modules", get(list_modules).post(create_module))
        .route("/modules/:id", put(update_module).delete(delete_module))
        .route("/lessons", get(list_lessons).post(create_lesson))
        .route("/lessons/:id", put(update_lesson).delete(delete_lesson))
        .route("/vocabulary", get(list_vocabulary).post(create_vocabulary))
        .route("/dialogues", get(list_dialogues).post(create_dialogue))
        .route("/quizzes", get(list_quizzes).post(create_quiz))
        // Interview Scenario Manager
        .route("/scenarios", get(list_scenarios).post(create_scenario))
        .route("/scenarios/:id", get(get_scenario).put(update_scenario).delete(delete_scenario))
        .route("/questions", post(add_question))
        .route("/questions/:id", delete(delete_question))
        // AI Config
        .route("/ai-config", get(list_ai_configs))
        .route("/ai-config/:key", put(update_ai_config))
        // Evaluation Weights
        .route("/evaluation-weights", get(get_evaluation_weights).put(update_evaluation_weights))
        // Gamification Config
        .route("/gamification", get(get_gamification_config).put(update_gamification_config))
        // Game Engine
        .route("/games", get(list_games).post(create_game))
        .route("/games/:id", put(update_game).delete(delete_game))
        // Ratings
        .route("/ratings", get(list_ratings))
        // Monetization & Feature Access
        .route("/features", get(list_features))
        .route("/features/:name", put(update_feature))
        .route("/monetization/config", get(get_monetization_config).put(update_monetization_config));

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
        .route("/interviews/:scenario_id/start", post(start_interview_session))
        .route("/interviews/sessions/:session_id/chat", post(send_chat_message))
        .route("/interviews/sessions/:session_id/complete", post(complete_interview_session));

    // ============ User Progress Routes (auth required) ============

    let progress_routes = Router::new()
        .route("/", get(get_progress))
        .route("/xp", post(add_xp))
        .route("/quiz", post(submit_quiz))
        .route("/game", post(submit_game_result))
        .route("/speaking", post(submit_speaking_result));

    // ============ Rating Routes (auth required) ============
    
    let rating_routes = Router::new()
        .route("/lessons", post(submit_lesson_rating));

    Router::new()
        .route("/", get(root))
        // Swagger UI
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        // Auth
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/me", get(get_me))
        .route("/auth/onboarding", put(update_onboarding))
        // Admin panel
        .nest("/admin", admin_routes)
        // Public content
        .nest("/api", public_content_routes)
        // User progress
        .nest("/progress", progress_routes)
        // User ratings
        .nest("/ratings", rating_routes)
        .layer(cors)
        .with_state(state)
}

async fn root() -> &'static str {
    "Welcome to the Hospitality English Learning API! 🏨✈️🚢"
}
