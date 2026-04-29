use axum::{
    extract::{State, Json, Path, Query, Multipart},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::models::{Admin, AdminLoginRequest, AdminAuthResponse, User, PaginationParams, PaginatedResponse};
use crate::handlers::AppError;
use crate::auth::{verify_password, create_admin_jwt};
use std::sync::Arc;
use crate::handlers::AppState;
use bson::oid::ObjectId;
use mongodb::options::FindOptions;
use futures::TryStreamExt;

/// POST /admin/login
pub async fn admin_login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AdminLoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Admin> = state.db.database("rustapi").collection("admins");

    let admin = collection.find_one(doc! { "email": &payload.email }).await?
        .ok_or(AppError::InvalidCredentials)?;

    if !admin.is_active {
        return Err(AppError::Forbidden);
    }

    if !verify_password(&payload.password, &admin.password) {
        return Err(AppError::InvalidCredentials);
    }

    // Update last login timestamp
    collection.update_one(
        doc! { "_id": admin.id.unwrap() },
        doc! { "$set": { "updated_at": bson::DateTime::now() } }
    ).await?;

    let token = create_admin_jwt(&admin.id.unwrap().to_string(), &state.jwt_secret)
        .map_err(|_| AppError::InternalServerError)?;

    let mut admin_to_return = admin;
    admin_to_return.password.clear();

    Ok(Json(AdminAuthResponse { token, admin: admin_to_return }))
}

/// GET /admin/me
pub async fn admin_me(
    mut admin: Admin,
) -> impl IntoResponse {
    admin.password.clear();
    Json(admin)
}

/// GET /admin/users — List all users with pagination
pub async fn list_users(
    State(state): State<Arc<AppState>>,
    _admin: Admin, // ensures admin auth
    Query(params): Query<PaginationParams>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<User> = state.db.database("rustapi").collection("users");

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let skip = (page - 1) * limit as u64;

    let total = collection.count_documents(doc! {}).await? as u64;

    let options = FindOptions::builder()
        .skip(skip)
        .limit(limit)
        .sort(doc! { "created_at": -1 })
        .build();

    let cursor = collection.find(doc! {}).with_options(options).await?;
    let users: Vec<User> = cursor.try_collect().await?;

    Ok(Json(PaginatedResponse {
        data: users,
        page,
        limit,
        total,
    }))
}

/// GET /admin/users/:id — Get a single user
pub async fn get_user(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = ObjectId::parse_str(&id)
        .map_err(|_| AppError::InvalidCredentials)?;

    let collection: Collection<User> = state.db.database("rustapi").collection("users");

    let user = collection.find_one(doc! { "_id": user_id }).await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(user))
}

/// DELETE /admin/users/:id — Deactivate (soft-delete) a user
pub async fn delete_user(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = ObjectId::parse_str(&id)
        .map_err(|_| AppError::InvalidCredentials)?;

    let collection: Collection<User> = state.db.database("rustapi").collection("users");

    let result = collection.delete_one(doc! { "_id": user_id }).await?;

    if result.deleted_count == 0 {
        return Err(AppError::NotFound);
    }

    Ok((StatusCode::OK, Json(serde_json::json!({
        "message": "User deleted successfully"
    }))))
}

/// POST /admin/assets/upload
pub async fn upload_asset(
    State(_state): State<Arc<AppState>>,
    _admin: Admin,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut file_bytes = None;
    let mut filename = None;
    let mut content_type = None;

    while let Some(field) = multipart.next_field().await.map_err(|_| AppError::InternalServerError)? {
        if field.name() == Some("file") {
            filename = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());
            file_bytes = Some(field.bytes().await.map_err(|_| AppError::InternalServerError)?);
            break;
        }
    }

    let file_bytes = file_bytes.ok_or(AppError::InternalServerError)?;
    let filename = filename.unwrap_or_else(|| "asset.bin".to_string());
    let content_type = content_type.unwrap_or_else(|| "application/octet-stream".to_string());

    let supabase_url = "https://jliibnwjluancnoayayd.supabase.co";
    let supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaWlibndqbHVhbmNub2F5YXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMDUxOTMsImV4cCI6MjA5MjU4MTE5M30.PDGYaSPI9bf4pfSwxrJJ6zAGHZRiQ-ezncn-d2MZoQE";
    
    let ext = filename.split('.').last().unwrap_or("bin");
    let asset_id = ObjectId::new().to_hex();
    let object_path = format!("assets/{}.{}", asset_id, ext);
    let upload_url = format!("{}/storage/v1/object/rustapi/{}", supabase_url, object_path);

    let client = reqwest::Client::new();
    let res = client.post(&upload_url)
        .header("Authorization", format!("Bearer {}", supabase_key))
        .header("apikey", supabase_key)
        .header("Content-Type", content_type)
        .body(file_bytes)
        .send()
        .await
        .map_err(|_| AppError::InternalServerError)?;

    if !res.status().is_success() {
        return Err(AppError::InternalServerError);
    }

    let public_url = format!("{}/storage/v1/object/public/rustapi/{}", supabase_url, object_path);

    Ok(Json(serde_json::json!({ "url": public_url })))
}
