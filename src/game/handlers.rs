use axum::{
    extract::{State, Json, Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::game::models::*;
use crate::models::{Admin, User, PaginationParams, PaginatedResponse};
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;
use mongodb::options::FindOptions;
use futures::TryStreamExt;

// ==================== ADMIN ENDPOINTS ====================

/// POST /admin/games
pub async fn create_game(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateGameRequest>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&payload.lesson_id).map_err(|_| AppError::NotFound)?;
    
    let ai_scenario_id = match payload.ai_scenario_id.as_deref() {
        Some(ai_id) if !ai_id.trim().is_empty() => Some(ObjectId::parse_str(ai_id).map_err(|_| AppError::NotFound)?),
        _ => None,
    };

    let module_id = match payload.module_id.as_deref() {
        Some(mid) if !mid.trim().is_empty() => Some(ObjectId::parse_str(mid).map_err(|_| AppError::NotFound)?),
        _ => None,
    };

    let collection: Collection<GameContent> = state.db.database("rustapi").collection("games");

    let game = GameContent {
        id: None,
        module_id,
        lesson_id,
        game_type: payload.game_type,
        title: payload.title,
        instructions: payload.instructions,
        difficulty: payload.difficulty,
        asset_url: payload.asset_url,
        data_json: payload.data_json,
        ai_scenario_id,
        xp_reward: payload.xp_reward.unwrap_or(10),
        is_active: true,
        order: payload.order.unwrap_or(0),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(game.clone()).await?;
    let mut created = game;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/games
pub async fn list_games(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Query(params): Query<PaginationParams>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<GameContent> = state.db.database("rustapi").collection("games");

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(50).min(100);
    let skip = (page - 1) * limit as u64;
    let total = collection.count_documents(doc! {}).await? as u64;

    let options = FindOptions::builder()
        .skip(skip).limit(limit).sort(doc! { "lesson_id": 1, "order": 1 }).build();

    let cursor = collection.find(doc! {}).with_options(options).await?;
    let data: Vec<GameContent> = cursor.try_collect().await?;

    Ok(Json(PaginatedResponse { data, page, limit, total }))
}

/// PUT /admin/games/:id
pub async fn update_game(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateGameRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<GameContent> = state.db.database("rustapi").collection("games");

    let mut update = doc! { "updated_at": bson::DateTime::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.instructions { update.insert("instructions", v); }
    if let Some(v) = payload.difficulty { update.insert("difficulty", v); }
    if let Some(v) = payload.asset_url { update.insert("asset_url", v); }
    if let Some(v) = payload.data_json { 
        update.insert("data_json", mongodb::bson::to_document(&v).unwrap_or(doc! {})); 
    }
    if let Some(v) = payload.ai_scenario_id { 
        if !v.trim().is_empty() {
            let ai_id = ObjectId::parse_str(&v).map_err(|_| AppError::NotFound)?;
            update.insert("ai_scenario_id", ai_id); 
        }
    }
    if let Some(v) = payload.xp_reward { update.insert("xp_reward", v); }
    if let Some(v) = payload.is_active { update.insert("is_active", v); }
    if let Some(v) = payload.order { update.insert("order", v); }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound)?;
    Ok(Json(updated))
}

/// DELETE /admin/games/:id
pub async fn delete_game(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<GameContent> = state.db.database("rustapi").collection("games");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound); }
    Ok(Json(serde_json::json!({ "message": "Game deleted" })))
}

// ==================== PUBLIC ENDPOINTS (For Mobile App) ====================

/// GET /api/lessons/:lesson_id/games
pub async fn public_list_lesson_games(
    State(state): State<Arc<AppState>>,
    Path(lesson_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let l_id = ObjectId::parse_str(&lesson_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<GameContent> = state.db.database("rustapi").collection("games");

    let cursor = collection.find(doc! { "lesson_id": l_id, "is_active": true })
        .sort(doc! { "order": 1 }).await?;
    
    let games: Vec<GameContent> = cursor.try_collect().await?;
    Ok(Json(games))
}

/// POST /progress/game — Submit a game result
pub async fn submit_game_result(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<SubmitGameResultRequest>,
) -> Result<impl IntoResponse, AppError> {
    let game_id = ObjectId::parse_str(&payload.game_id).map_err(|_| AppError::NotFound)?;
    let user_id = user.id.unwrap();

    let collection: Collection<GameResult> = state.db.database("rustapi").collection("game_results");
    
    let result = GameResult {
        id: None,
        user_id,
        game_id,
        score: payload.score,
        attempts: payload.attempts,
        completed: payload.completed,
        created_at: Utc::now(),
    };

    collection.insert_one(result.clone()).await?;

    // Add XP if completed
    if payload.completed {
        let game_coll: Collection<GameContent> = state.db.database("rustapi").collection("games");
        if let Some(game) = game_coll.find_one(doc! { "_id": game_id }).await? {
            crate::progress::handlers::add_xp(
                State(state),
                user,
                Json(crate::progress::models::AddXPRequest { 
                    xp: game.xp_reward, 
                    lesson_id: Some(game.lesson_id.to_string()), 
                    quiz_id: None 
                })
            ).await?;
        }
    }

    Ok(Json(serde_json::json!({ "message": "Result saved successfully" })))
}

/// POST /progress/speaking — Submit speaking/pronunciation result
pub async fn submit_speaking_result(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<SubmitSpeakingRequest>,
) -> Result<impl IntoResponse, AppError> {
    let game_id = if let Some(gid) = payload.game_id {
        Some(ObjectId::parse_str(&gid).map_err(|_| AppError::NotFound)?)
    } else {
        None
    };

    let collection: Collection<SpeakingResult> = state.db.database("rustapi").collection("speaking_results");

    let result = SpeakingResult {
        id: None,
        user_id: user.id.unwrap(),
        game_id,
        sentence: payload.sentence,
        score: payload.score,
        pronunciation_score: payload.pronunciation_score,
        fluency_score: payload.fluency_score,
        audio_url: payload.audio_url,
        created_at: Utc::now(),
    };

    collection.insert_one(result.clone()).await?;

    Ok(Json(serde_json::json!({ "message": "Speaking result saved successfully" })))
}
