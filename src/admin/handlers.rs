use axum::{
    extract::{State, Json, Path, Query, Multipart},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::models::{Admin, AdminLoginRequest, AdminAuthResponse, User, PaginationParams, PaginatedResponse, DashboardStats, UpdateUserRequest, Asset};
use crate::handlers::AppError;
use crate::auth::{verify_password, create_admin_jwt};
use std::sync::Arc;
use crate::handlers::AppState;
use bson::oid::ObjectId;
use mongodb::options::FindOptions;
use futures::TryStreamExt;
use chrono::Utc;
use crate::content::models::{MasterData, UpdateMasterDataRequest};

/// GET /admin/master-data
pub async fn list_master_data(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let col = state.db.database("rustapi").collection::<MasterData>("master_data");
    let cursor = col.find(doc! {}).await?;
    let data: Vec<MasterData> = cursor.try_collect().await?;
    Ok(Json(data))
}

/// GET /admin/master-data/:category
pub async fn get_master_data(
    State(state): State<Arc<AppState>>,
    Path(category): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let col = state.db.database("rustapi").collection::<MasterData>("master_data");
    let data = col.find_one(doc! { "category": &category }).await?;
    
    match data {
        Some(d) => Ok(Json(d)),
        None => {
            // Return default empty if not found, or error. 
            // The user wants "master data", so let's return 404 to indicate it needs setup.
            Err(AppError::NotFound(format!("Master data category '{}' not found", category)))
        }
    }
}

/// PUT /admin/master-data/:category
pub async fn update_master_data(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(category): Path<String>,
    Json(payload): Json<UpdateMasterDataRequest>,
) -> Result<impl IntoResponse, AppError> {
    let col = state.db.database("rustapi").collection::<MasterData>("master_data");
    
    let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
    col.update_one(
        doc! { "category": &category },
        doc! { 
            "$set": { 
                "options": &payload.options,
                "updated_at": bson::DateTime::now()
            },
            "$setOnInsert": { "category": &category }
        }
    ).with_options(options).await?;

    Ok(StatusCode::OK)
}


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
        return Err(AppError::Forbidden("Access denied: Invalid credentials or insufficient permissions".to_string()));
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
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut file_bytes = None;
    let mut filename = None;
    let mut content_type = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(format!("Multipart error: {:?}", e)))? {
        if field.name() == Some("file") {
            filename = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());
            file_bytes = Some(field.bytes().await.map_err(|e| AppError::BadRequest(format!("Field bytes error: {:?}", e)))?);
            break;
        }
    }

    let file_bytes = file_bytes.ok_or(AppError::InternalServerError)?;
    let mut filename = filename.unwrap_or_else(|| "asset.bin".to_string());
    let mut content_type = content_type.unwrap_or_else(|| "application/octet-stream".to_string());
    let mut final_bytes = file_bytes.to_vec();

    // If it's a video, attempt native macOS hardware-accelerated compression using avconvert
    if content_type.starts_with("video/") {
        let temp_dir = std::env::temp_dir();
        let input_id = ObjectId::new().to_hex();
        let ext = filename.split('.').next_back().unwrap_or("mp4");
        let input_path = temp_dir.join(format!("input_{}.{}", input_id, ext));
        let output_path = temp_dir.join(format!("output_{}.mp4", input_id));

        if let Ok(_) = std::fs::write(&input_path, &final_bytes) {
            println!("🎥 Compressing video using macOS avconvert (720p HD Preset)...");
            let status = std::process::Command::new("avconvert")
                .args(&[
                    "-s", input_path.to_str().unwrap(),
                    "-p", "Preset1280x720",
                    "-o", output_path.to_str().unwrap(),
                    "--replace"
                ])
                .status();

            match status {
                Ok(s) if s.success() => {
                    if let Ok(compressed) = std::fs::read(&output_path) {
                        println!("✅ Video compressed successfully! Size reduced from {} to {} bytes", final_bytes.len(), compressed.len());
                        final_bytes = compressed;
                        content_type = "video/mp4".to_string();
                        // Adjust filename extension to mp4
                        if ext != "mp4" {
                            let base = filename.split('.').next().unwrap_or("video");
                            filename = format!("{}.mp4", base);
                        }
                    }
                }
                other => {
                    println!("⚠️ avconvert compression failed or skipped: {:?}", other);
                }
            }
            let _ = std::fs::remove_file(&input_path);
            let _ = std::fs::remove_file(&output_path);
        }
    }

    let public_url = crate::storage::upload_file_dynamically(
        &state.db,
        final_bytes,
        &filename,
        &content_type,
        ""
    ).await?;

    let asset_type = if content_type.starts_with("image/") {
        "image"
    } else if content_type.starts_with("audio/") {
        "audio"
    } else if content_type.starts_with("video/") {
        "video"
    } else {
        "other"
    };

    let new_asset = Asset {
        id: None,
        filename: filename.clone(),
        content_type: content_type.clone(),
        public_url: public_url.clone(),
        asset_type: asset_type.to_string(),
        provider: "dynamic".to_string(),
        created_at: Utc::now(),
    };

    let col: Collection<Asset> = state.db.database("rustapi").collection("assets");
    col.insert_one(new_asset).await?;

    Ok(Json(serde_json::json!({ "url": public_url })))
}

/// GET /admin/assets
pub async fn list_assets(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<Asset> = state.db.database("rustapi").collection("assets");
    let mut options = FindOptions::default();
    options.sort = Some(doc! { "created_at": -1 });
    let cursor = col.find(doc! {}).with_options(options).await?;
    let assets: Vec<Asset> = cursor.try_collect().await?;
    Ok(Json(assets))
}

/// DELETE /admin/assets/:id
pub async fn delete_asset(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<Asset> = state.db.database("rustapi").collection("assets");
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".into()))?;
    col.delete_one(doc! { "_id": oid }).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

/// GET /uploads/:name
pub async fn serve_upload(
    Path(name): Path<String>,
) -> Result<impl IntoResponse, axum::http::StatusCode> {
    let path = std::path::Path::new("uploads").join(name);
    let bytes = std::fs::read(&path).map_err(|_| axum::http::StatusCode::NOT_FOUND)?;
    
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("bin");
    let content_type = match ext {
        "mp4" => "video/mp4",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "mp3" => "audio/mpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    };

    Ok((
        [("content-type", content_type)],
        bytes
    ))
}
