use axum::{
    extract::{State, Json},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use mongodb::{Client, Collection, bson::doc};
use crate::models::{User, RegisterRequest, LoginRequest, AuthResponse, Progress};
use crate::auth::{hash_password, verify_password, create_jwt};
use chrono::Utc;
use std::sync::Arc;
use serde_json::json;

pub struct AppState {
    pub db: Client,
    pub jwt_secret: String,
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<User> = state.db.database("rustapi").collection("users");

    // Check if user already exists
    if collection.find_one(doc! { "email": &payload.email }).await?.is_some() {
        return Err(AppError::UserAlreadyExists);
    }

    let hashed_password = hash_password(&payload.password);
    
    let new_user = User {
        id: None,
        email: payload.email,
        password: hashed_password,
        name: payload.name,
        persona: payload.persona,
        progress: Progress {
            streak_days: 0,
            total_practice: 0,
        },
        is_verified: false,
        last_login: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(new_user.clone()).await?;
    let inserted_id = result.inserted_id.as_object_id().unwrap();
    
    let mut user_with_id = new_user;
    user_with_id.id = Some(inserted_id);

    let token = create_jwt(&inserted_id.to_string(), &state.jwt_secret)
        .map_err(|_| AppError::InternalServerError)?;

    Ok((StatusCode::CREATED, Json(AuthResponse { token, user: user_with_id })))
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<User> = state.db.database("rustapi").collection("users");

    let user = collection.find_one(doc! { "email": &payload.email }).await?
        .ok_or(AppError::InvalidCredentials)?;

    if !verify_password(&payload.password, &user.password) {
        return Err(AppError::InvalidCredentials);
    }

    // Update last login
    collection.update_one(
        doc! { "_id": user.id.unwrap() },
        doc! { "$set": { "last_login": mongodb::bson::DateTime::now() } }
    ).await?;

    let token = create_jwt(&user.id.unwrap().to_string(), &state.jwt_secret)
        .map_err(|_| AppError::InternalServerError)?;

    Ok(Json(AuthResponse { token, user }))
}

pub async fn get_me(
    State(_state): State<Arc<AppState>>,
    user: User, 
) -> impl IntoResponse {
    Json(user)
}

// Error Handling
#[derive(Debug)]
pub enum AppError {
    InvalidCredentials,
    UserAlreadyExists,
    InternalServerError,
    DatabaseError(#[allow(dead_code)] mongodb::error::Error),
}

impl From<mongodb::error::Error> for AppError {
    fn from(err: mongodb::error::Error) -> Self {
        AppError::DatabaseError(err)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::InvalidCredentials => (StatusCode::UNAUTHORIZED, "Invalid email or password"),
            AppError::UserAlreadyExists => (StatusCode::CONFLICT, "User already exists"),
            AppError::InternalServerError => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
            AppError::DatabaseError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}
