pub mod models;
pub mod auth;
pub mod handlers;
pub mod middleware;

use axum::{
    routing::{get, post},
    Router,
};
use mongodb::Client;
use std::sync::Arc;
use crate::handlers::{AppState, register, login, get_me};
use tower_http::cors::{CorsLayer, Any};

pub async fn create_app() -> Router {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let client = Client::with_uri_str(&database_url)
        .await
        .expect("Failed to initialize MongoDB client");

    let state = Arc::new(AppState {
        db: client,
        jwt_secret,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/", get(root))
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/me", get(get_me))
        .layer(cors)
        .with_state(state)
}

async fn root() -> &'static str {
    "Welcome to the Rust Auth API!"
}
