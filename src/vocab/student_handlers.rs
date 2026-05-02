use axum::{
    extract::{State, Json, Path},
    response::IntoResponse,
    http::StatusCode,
};
use mongodb::bson::{doc, oid::ObjectId};
use std::sync::Arc;
use futures::stream::StreamExt;

use crate::handlers::{AppState, AppError};
use crate::models::User;
use crate::vocab::models::{VocabSet, VocabWord, UserVocabProgress, ConversationRequest};

// ==================== Student Vocab Endpoints ====================

/// GET /student/vocab-sets — list published sets
pub async fn get_published_sets(
    State(state): State<Arc<AppState>>,
    _user: User,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col = db.collection::<VocabSet>("vocab_sets");

    let mut cursor = col.find(doc! { "status": "published" }).await?;
    let mut sets = Vec::new();
    while let Some(set) = cursor.next().await {
        sets.push(set?);
    }
    Ok(Json(sets))
}

/// GET /student/vocab-sets/:id/words — get words for a set
pub async fn get_set_words(
    State(state): State<Arc<AppState>>,
    _user: User,
    Path(set_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&set_id)
        .map_err(|_| AppError::BadRequest("Invalid set ID".to_string()))?;
    let db = state.db.database("rustapi");
    let col = db.collection::<VocabWord>("vocab_words");

    let mut cursor = col.find(doc! { "set_id": oid }).await?;
    let mut words = Vec::new();
    while let Some(w) = cursor.next().await {
        words.push(w?);
    }
    Ok(Json(words))
}

// ==================== Progress & SM-2 ====================

#[derive(Debug, serde::Deserialize)]
pub struct SubmitProgressRequest {
    pub set_id: String,
    pub word_id: String,
    pub game_type: String,
    pub quality: i32, // 0-5 SM-2 quality rating
}

/// POST /student/vocab-progress — submit an answer and update SM-2
pub async fn submit_progress(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<SubmitProgressRequest>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col = db.collection::<UserVocabProgress>("user_vocab_progress");

    let set_oid = ObjectId::parse_str(&payload.set_id)
        .map_err(|_| AppError::BadRequest("Invalid set_id".to_string()))?;
    let word_oid = ObjectId::parse_str(&payload.word_id)
        .map_err(|_| AppError::BadRequest("Invalid word_id".to_string()))?;
    let user_id = user.id.unwrap().to_hex();

    // Find or create progress record
    let filter = doc! {
        "user_id": &user_id,
        "word_id": word_oid,
        "game_type": &payload.game_type,
    };

    let existing = col.find_one(filter.clone()).await?;
    let now = mongodb::bson::DateTime::now();
    let quality = payload.quality.clamp(0, 5);

    match existing {
        Some(mut prog) => {
            // SM-2 algorithm update
            let (new_ef, new_interval, new_status) = sm2_update(
                prog.ease_factor, prog.interval_days, prog.correct_count, quality,
            );
            let next_review = mongodb::bson::DateTime::from_millis(
                now.timestamp_millis() + (new_interval as i64 * 86_400_000),
            );

            col.update_one(
                doc! { "_id": prog.id.unwrap() },
                doc! { "$set": {
                    "ease_factor": new_ef,
                    "interval_days": new_interval,
                    "status": &new_status,
                    "correct_count": if quality >= 3 { prog.correct_count + 1 } else { prog.correct_count },
                    "attempt_count": prog.attempt_count + 1,
                    "next_review": next_review,
                    "last_reviewed_at": now,
                }},
            ).await?;

            prog.ease_factor = new_ef;
            prog.interval_days = new_interval;
            prog.status = new_status;
        }
        None => {
            // First attempt — create new record
            let (new_ef, new_interval, new_status) = sm2_update(2.5, 0, 0, quality);
            let next_review = mongodb::bson::DateTime::from_millis(
                now.timestamp_millis() + (new_interval as i64 * 86_400_000),
            );

            let new_prog = UserVocabProgress {
                id: None,
                user_id: user_id.clone(),
                set_id: set_oid,
                word_id: word_oid,
                game_type: payload.game_type.clone(),
                status: new_status,
                is_bookmarked: false,
                ease_factor: new_ef,
                interval_days: new_interval,
                correct_count: if quality >= 3 { 1 } else { 0 },
                attempt_count: 1,
                next_review: Some(next_review),
                last_reviewed_at: Some(now),
            };
            col.insert_one(new_prog).await?;
        }
    }

    Ok(StatusCode::OK)
}

/// SM-2 spaced repetition algorithm
fn sm2_update(ease_factor: f64, interval: i32, correct_count: i32, quality: i32) -> (f64, i32, String) {
    if quality < 3 {
        // Failed — reset interval
        return (ease_factor.max(1.3), 1, "learning".to_string());
    }

    let new_ef = (ease_factor + 0.1 - (5.0 - quality as f64) * (0.08 + (5.0 - quality as f64) * 0.02)).max(1.3);
    let new_interval = match correct_count {
        0 => 1,
        1 => 3,
        _ => (interval as f64 * new_ef).round() as i32,
    };
    let status = if new_interval >= 21 { "mastered" } else { "learning" };

    (new_ef, new_interval, status.to_string())
}

// ==================== Bookmarks ====================

/// PATCH /student/vocab/:word_id/bookmark — toggle bookmark
pub async fn toggle_bookmark(
    State(state): State<Arc<AppState>>,
    user: User,
    Path(word_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col = db.collection::<UserVocabProgress>("user_vocab_progress");
    let user_id = user.id.unwrap().to_hex();
    let word_oid = ObjectId::parse_str(&word_id)
        .map_err(|_| AppError::BadRequest("Invalid word_id".to_string()))?;

    // Find any progress record for this word (any game_type)
    let filter = doc! { "user_id": &user_id, "word_id": word_oid };
    let existing = col.find_one(filter.clone()).await?;

    match existing {
        Some(prog) => {
            let new_val = !prog.is_bookmarked;
            // Update ALL game-type records for this word
            col.update_many(
                filter,
                doc! { "$set": { "is_bookmarked": new_val } },
            ).await?;
            Ok(Json(serde_json::json!({ "is_bookmarked": new_val })))
        }
        None => {
            // No progress yet — create a bookmark-only record
            let word_col = db.collection::<VocabWord>("vocab_words");
            let word = word_col.find_one(doc! { "_id": word_oid }).await?
                .ok_or(AppError::NotFound)?;

            let new_prog = UserVocabProgress {
                id: None,
                user_id,
                set_id: word.set_id,
                word_id: word_oid,
                game_type: "flashcard".to_string(),
                status: "unseen".to_string(),
                is_bookmarked: true,
                ease_factor: 2.5,
                interval_days: 0,
                correct_count: 0,
                attempt_count: 0,
                next_review: None,
                last_reviewed_at: None,
            };
            col.insert_one(new_prog).await?;
            Ok(Json(serde_json::json!({ "is_bookmarked": true })))
        }
    }
}

/// GET /student/bookmarks — list all bookmarked words with their details
pub async fn get_bookmarks(
    State(state): State<Arc<AppState>>,
    user: User,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let prog_col = db.collection::<UserVocabProgress>("user_vocab_progress");
    let word_col = db.collection::<VocabWord>("vocab_words");
    let user_id = user.id.unwrap().to_hex();

    // Get unique bookmarked word_ids
    let mut cursor = prog_col.find(doc! {
        "user_id": &user_id,
        "is_bookmarked": true,
    }).await?;

    let mut word_ids = Vec::new();
    let mut seen = std::collections::HashSet::new();
    while let Some(prog) = cursor.next().await {
        let p = prog?;
        if seen.insert(p.word_id) {
            word_ids.push(p.word_id);
        }
    }

    // Fetch the actual word data
    let mut words = Vec::new();
    if !word_ids.is_empty() {
        let mut word_cursor = word_col.find(doc! {
            "_id": { "$in": &word_ids }
        }).await?;
        while let Some(w) = word_cursor.next().await {
            words.push(w?);
        }
    }

    Ok(Json(words))
}

// ==================== Conversation Requests ====================

#[derive(Debug, serde::Deserialize)]
pub struct CreateConversationRequest {
    pub target_vocab: Vec<String>, // word IDs
    pub context_note: String,
}

/// POST /student/conversation-requests — submit a practice request
pub async fn create_conversation_request(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<CreateConversationRequest>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col = db.collection::<ConversationRequest>("conversation_requests");
    let user_id = user.id.unwrap().to_hex();

    let word_oids: Result<Vec<ObjectId>, _> = payload.target_vocab.iter()
        .map(|id| ObjectId::parse_str(id))
        .collect();
    let word_oids = word_oids
        .map_err(|_| AppError::BadRequest("Invalid word ID in target_vocab".to_string()))?;

    if word_oids.is_empty() || word_oids.len() > 15 {
        return Err(AppError::BadRequest("Select 1-15 words for practice".to_string()));
    }

    let now = mongodb::bson::DateTime::now();
    let req = ConversationRequest {
        id: None,
        user_id,
        target_vocab: word_oids,
        context_note: payload.context_note,
        status: "pending".to_string(),
        scenario_id: None,
        created_at: Some(now),
        resolved_at: None,
    };

    col.insert_one(req).await?;
    Ok(StatusCode::CREATED)
}

/// GET /student/conversation-requests — list student's own requests
pub async fn list_my_requests(
    State(state): State<Arc<AppState>>,
    user: User,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col = db.collection::<ConversationRequest>("conversation_requests");
    let user_id = user.id.unwrap().to_hex();

    let mut cursor = col.find(doc! { "user_id": &user_id }).await?;
    let mut requests = Vec::new();
    while let Some(r) = cursor.next().await {
        requests.push(r?);
    }

    Ok(Json(requests))
}
