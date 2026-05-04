use axum::{
    extract::{State, Json, Path, Query, Multipart},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::models::{Admin, AdminLoginRequest, AdminAuthResponse, User, PaginationParams, PaginatedResponse, DashboardStats, UpdateUserRequest};
use crate::handlers::AppError;
use crate::auth::{verify_password, create_admin_jwt};
use std::sync::Arc;
use crate::handlers::AppState;
use bson::oid::ObjectId;
use mongodb::options::FindOptions;
use futures::TryStreamExt;
use chrono::Utc;

/// POST /admin/login
/// ... (rest of imports and handlers)
/// GET /admin/dashboard/stats
pub async fn get_dashboard_stats(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let users_col = state.db.database("rustapi").collection::<User>("users");
    let courses_col = state.db.database("rustapi").collection::<bson::Document>("courses");
    let scenarios_col = state.db.database("rustapi").collection::<bson::Document>("speaking_scenarios");
    let sessions_col = state.db.database("rustapi").collection::<bson::Document>("speaking_sessions");
    let vocab_col = state.db.database("rustapi").collection::<bson::Document>("vocab_sets");

    let total_users = users_col.count_documents(doc! {}).await?;
    let total_courses = courses_col.count_documents(doc! {}).await?;
    let total_scenarios = scenarios_col.count_documents(doc! {}).await?;
    let total_speaking_sessions = sessions_col.count_documents(doc! {}).await?;
    let total_vocab_sets = vocab_col.count_documents(doc! {}).await?;

    // Active users today (logged in last 24h)
    let yesterday = Utc::now() - chrono::Duration::days(1);
    let active_users_today = users_col.count_documents(doc! {
        "last_login": { "$gte": bson::DateTime::from_chrono(yesterday) }
    }).await?;

    Ok(Json(DashboardStats {
        total_users,
        total_courses,
        total_scenarios,
        total_speaking_sessions,
        total_vocab_sets,
        active_users_today,
    }))
}

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

#[derive(Debug, serde::Deserialize)]
pub struct UpdateAdminRequest {
    pub name: Option<String>,
    pub profile_image_url: Option<String>,
}

/// PUT /admin/me
pub async fn update_admin_me(
    State(state): State<Arc<AppState>>,
    admin: Admin,
    Json(payload): Json<UpdateAdminRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Admin> = state.db.database("rustapi").collection("admins");

    let mut update_doc = doc! {
        "updated_at": bson::DateTime::now()
    };

    if let Some(name) = payload.name {
        update_doc.insert("name", name);
    }
    if let Some(profile_image_url) = payload.profile_image_url {
        update_doc.insert("profile_image_url", profile_image_url);
    }

    collection.update_one(
        doc! { "_id": admin.id.unwrap() },
        doc! { "$set": update_doc }
    ).await?;

    let mut updated_admin = collection.find_one(doc! { "_id": admin.id.unwrap() }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))?;
    
    updated_admin.password.clear();
    Ok(Json(updated_admin))
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
        .ok_or(AppError::NotFound("Not found".to_string()))?;

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
        return Err(AppError::NotFound("Not found".to_string()));
    }

    Ok((StatusCode::OK, Json(serde_json::json!({
        "message": "User deleted successfully"
    }))))
}

/// PUT /admin/users/:id — Update a user
pub async fn update_user(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = ObjectId::parse_str(&id)
        .map_err(|_| AppError::InvalidCredentials)?;

    let collection: Collection<User> = state.db.database("rustapi").collection("users");

    println!("📝 Updating user {}: {:?}", id, payload);

    let mut update_doc = doc! {};
    
    if let Some(name) = payload.name {
        update_doc.insert("name", name);
    }
    if let Some(level) = payload.level {
        update_doc.insert("level", level);
    }
    if let Some(xp) = payload.xp {
        update_doc.insert("xp", xp);
    }
    if let Some(profile_image_url) = payload.profile_image_url {
        update_doc.insert("profile_image_url", profile_image_url);
    }
    if let Some(is_verified) = payload.is_verified {
        update_doc.insert("is_verified", is_verified);
    }

    if update_doc.is_empty() {
        return Ok(axum::http::StatusCode::OK.into_response());
    }

    update_doc.insert("updated_at", bson::DateTime::now());

    let result = collection.update_one(
        doc! { "_id": user_id },
        doc! { "$set": update_doc }
    ).await?;

    if result.matched_count == 0 {
        return Err(AppError::NotFound("Not found".to_string()));
    }

    Ok(axum::http::StatusCode::OK.into_response())
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

    let supabase_url = "https://jliibnwjluancnoayayd.storage.supabase.co";
    let supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaWlibndqbHVhbmNub2F5YXlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAwNTE5MywiZXhwIjoyMDkyNTgxMTkzfQ.gk97AUKZ-Gk_fZXxQ9CVyKN3znj3QjTbGjfzHYSBREc";
    
    let ext = filename.split('.').next_back().unwrap_or("bin");
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
        .map_err(|e| {
            eprintln!("❌ Supabase upload request failed: {:?}", e);
            AppError::InternalServerError
        })?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        eprintln!("❌ Supabase returned error: {} - {}", status, body);
        return Err(AppError::InternalServerError);
    }

    let public_url = format!("{}/storage/v1/object/public/rustapi/{}", supabase_url, object_path);
    println!("✅ Asset uploaded successfully: {}", public_url);

    Ok(Json(serde_json::json!({ "url": public_url })))
}
