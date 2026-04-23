pub mod models;
pub mod auth;
pub mod handlers;
pub mod middleware;
pub mod admin_handlers;
pub mod admin_middleware;
pub mod seed;

use axum::{
    routing::{get, post, delete},
    Router,
};
use mongodb::Client;
use std::sync::Arc;
use crate::handlers::{AppState, register, login, get_me};
use crate::admin_handlers::{admin_login, admin_me, list_users, get_user, delete_user};
use crate::seed::seed_admin;
use tower_http::cors::{CorsLayer, Any};

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

    // Admin routes
    let admin_routes = Router::new()
        .route("/login", post(admin_login))
        .route("/me", get(admin_me))
        .route("/users", get(list_users))
        .route("/users/{id}", get(get_user).delete(delete_user));

    Router::new()
        .route("/", get(root))
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/me", get(get_me))
        .nest("/admin", admin_routes)
        .layer(cors)
        .with_state(state)
}

async fn root() -> &'static str {
    "Welcome to the Rust Auth API!"
}
