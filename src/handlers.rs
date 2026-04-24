use axum::{
    extract::{State, Json, Multipart},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use mongodb::{Client, Collection, bson::doc};
use crate::models::{User, RegisterRequest, LoginRequest, FirebaseLoginRequest, AuthResponse, Progress, Persona, OnboardingRequest};
use crate::auth::{hash_password, verify_password, create_jwt};
use chrono::Utc;
use std::sync::Arc;
use serde_json::{json, Value};
use jsonwebtoken::{decode_header, decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};

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
    
    let default_persona = Persona {
        level: "beginner".to_string(),
        tone: "friendly".to_string(),
        goal: "General".to_string(),
        weakness: None,
    };

    let new_user = User {
        id: None,
        email: payload.email,
        password: hashed_password,
        name: payload.name,
        profile_image_url: None,
        persona: payload.persona.unwrap_or(default_persona),
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

    // Send welcome notification
    let notifications_collection: Collection<crate::models::Notification> = state.db.database("rustapi").collection("notifications");
    let welcome_notification = crate::models::Notification {
        id: None,
        user_id: Some(inserted_id),
        title: "Welcome to Hospitality English Learning! 🎉".to_string(),
        message: "We're excited to have you here. Start by exploring our courses and lessons to improve your hospitality English skills.".to_string(),
        is_read: false,
        created_at: Utc::now(),
    };
    let _ = notifications_collection.insert_one(welcome_notification).await;

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

/// PUT /auth/onboarding
/// Updates the user's persona after initial registration
pub async fn update_onboarding(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<OnboardingRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<User> = state.db.database("rustapi").collection("users");

    let updated_persona = Persona {
        level: payload.level,
        tone: payload.tone,
        goal: payload.goal,
        weakness: payload.weakness,
    };

    let result = collection.update_one(
        doc! { "_id": user.id.unwrap() },
        doc! { 
            "$set": { 
                "persona": mongodb::bson::to_bson(&updated_persona).unwrap(),
                "updated_at": mongodb::bson::DateTime::now()
            } 
        }
    ).await?;

    if result.matched_count == 0 {
        return Err(AppError::NotFound);
    }

    let updated_user = collection.find_one(doc! { "_id": user.id.unwrap() }).await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(updated_user))
}

#[derive(Debug, Deserialize)]
pub struct FirebaseClaims {
    pub email: Option<String>,
    pub name: Option<String>,
    pub picture: Option<String>,
    pub sub: String,
}

pub async fn firebase_login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<FirebaseLoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Fetch Google's public keys
    let keys_url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
    let certs: std::collections::HashMap<String, String> = reqwest::get(keys_url)
        .await
        .map_err(|_| AppError::InternalServerError)?
        .json()
        .await
        .map_err(|_| AppError::InternalServerError)?;

    // 2. Decode JWT header to find the kid
    let header = decode_header(&payload.id_token).map_err(|_| AppError::InvalidCredentials)?;
    let kid = header.kid.ok_or(AppError::InvalidCredentials)?;

    // 3. Get the correct certificate
    let cert_pem = certs.get(&kid).ok_or(AppError::InvalidCredentials)?;
    
    // 4. Decode and validate the token (RS256)
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_audience(&["rustapi-34bbb"]);
    validation.set_issuer(&["https://securetoken.google.com/rustapi-34bbb"]);
    let token_data = decode::<FirebaseClaims>(
        &payload.id_token,
        &DecodingKey::from_rsa_pem(cert_pem.as_bytes()).map_err(|_| AppError::InternalServerError)?,
        &validation,
    ).map_err(|_| AppError::InvalidCredentials)?;

    let claims = token_data.claims;
    let email = claims.email.unwrap_or_else(|| format!("{}@firebase.user", claims.sub));

    let collection: Collection<User> = state.db.database("rustapi").collection("users");

    // 5. Find or create user
    let user = if let Some(mut existing_user) = collection.find_one(doc! { "email": &email }).await? {
        // Update last login
        collection.update_one(
            doc! { "_id": existing_user.id.unwrap() },
            doc! { "$set": { "last_login": mongodb::bson::DateTime::now() } }
        ).await?;
        existing_user.last_login = Some(Utc::now());
        existing_user
    } else {
        let default_persona = Persona {
            level: "beginner".to_string(),
            tone: "friendly".to_string(),
            goal: "General".to_string(),
            weakness: None,
        };

        // Create random password since they login via OAuth
        let random_password = format!("oauth-{}", claims.sub);
        
        let new_user = User {
            id: None,
            email: email.clone(),
            password: hash_password(&random_password),
            name: claims.name,
            profile_image_url: claims.picture,
            persona: default_persona,
            progress: Progress {
                streak_days: 0,
                total_practice: 0,
            },
            is_verified: true, // Auto verify OAuth users
            last_login: Some(Utc::now()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let result = collection.insert_one(new_user.clone()).await?;
        let mut user_with_id = new_user;
        user_with_id.id = Some(result.inserted_id.as_object_id().unwrap());
        user_with_id
    };

    let token = create_jwt(&user.id.unwrap().to_string(), &state.jwt_secret)
        .map_err(|_| AppError::InternalServerError)?;

    Ok(Json(AuthResponse { token, user }))
}

pub async fn upload_profile_image(
    State(state): State<Arc<AppState>>,
    user: User,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut image_bytes = None;
    let mut filename = None;
    let mut content_type = None;

    while let Some(field) = multipart.next_field().await.map_err(|_| AppError::InternalServerError)? {
        if field.name() == Some("image") {
            filename = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());
            image_bytes = Some(field.bytes().await.map_err(|_| AppError::InternalServerError)?);
            break;
        }
    }

    let image_bytes = image_bytes.ok_or(AppError::InvalidCredentials)?; // or another error type like BadRequest
    let filename = filename.unwrap_or_else(|| "profile.jpg".to_string());
    let content_type = content_type.unwrap_or_else(|| "image/jpeg".to_string());

    let supabase_url = "https://jliibnwjluancnoayayd.supabase.co";
    let supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaWlibndqbHVhbmNub2F5YXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMDUxOTMsImV4cCI6MjA5MjU4MTE5M30.PDGYaSPI9bf4pfSwxrJJ6zAGHZRiQ-ezncn-d2MZoQE";
    
    // We use the `rustapi` bucket.
    let user_id = user.id.unwrap().to_string();
    let ext = filename.split('.').last().unwrap_or("jpg");
    let object_path = format!("{}/profile.{}", user_id, ext);
    let upload_url = format!("{}/storage/v1/object/rustapi/{}", supabase_url, object_path);

    let client = reqwest::Client::new();
    let res = client.post(&upload_url)
        .header("Authorization", format!("Bearer {}", supabase_key))
        .header("apikey", supabase_key)
        .header("Content-Type", content_type)
        .body(image_bytes)
        .send()
        .await
        .map_err(|_| AppError::InternalServerError)?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        println!("Supabase upload error: {}", err_text);
        return Err(AppError::InternalServerError);
    }

    let public_url = format!("{}/storage/v1/object/public/rustapi/{}", supabase_url, object_path);

    let collection: Collection<User> = state.db.database("rustapi").collection("users");
    collection.update_one(
        doc! { "_id": user.id.unwrap() },
        doc! { 
            "$set": { 
                "profile_image_url": &public_url,
                "updated_at": mongodb::bson::DateTime::now()
            } 
        }
    ).await?;

    let updated_user = collection.find_one(doc! { "_id": user.id.unwrap() }).await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(updated_user))
}

// Error Handling
#[derive(Debug)]
pub enum AppError {
    InvalidCredentials,
    UserAlreadyExists,
    Forbidden,
    NotFound,
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
            AppError::Forbidden => (StatusCode::FORBIDDEN, "Access denied"),
            AppError::NotFound => (StatusCode::NOT_FOUND, "Resource not found"),
            AppError::InternalServerError => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
            AppError::DatabaseError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}
