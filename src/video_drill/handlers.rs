use crate::handlers::{AppError, AppState};
use crate::models::{Admin, User};
use crate::video_drill::models::*;
use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use bson::oid::ObjectId;
use chrono::Utc;
use futures::TryStreamExt;
use mongodb::{Collection, bson::doc};
use std::sync::Arc;

const COLLECTION: &str = "video_drills";
const RESULTS_COLLECTION: &str = "video_drill_results";

// ==================== ADMIN ENDPOINTS ====================

/// POST /admin/video-drills
pub async fn create_video_drill(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateVideoDrillRequest>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = match payload.lesson_id.as_deref() {
        Some(lid) if !lid.trim().is_empty() => Some(
            ObjectId::parse_str(lid)
                .map_err(|_| AppError::NotFound("Invalid lesson_id".to_string()))?,
        ),
        _ => None,
    };

    let collection: Collection<VideoDrill> =
        state.db.database("rustapi").collection(COLLECTION);

    let drill = VideoDrill {
        id: None,
        title: payload.title,
        topic: payload.topic,
        level: payload.level,
        lesson_id,
        steps: payload.steps,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(drill.clone()).await?;
    let mut created = drill;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/video-drills
pub async fn list_video_drills(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Query(params): Query<VideoDrillQuery>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<VideoDrill> =
        state.db.database("rustapi").collection(COLLECTION);

    let mut filter = doc! {};
    if let Some(ref topic) = params.topic {
        filter.insert("topic", topic);
    }
    if let Some(ref level) = params.level {
        filter.insert("level", level);
    }
    if let Some(ref lid) = params.lesson_id {
        if let Ok(oid) = ObjectId::parse_str(lid) {
            filter.insert("lesson_id", oid);
        }
    }

    let cursor = collection
        .find(filter)
        .sort(doc! { "created_at": -1 })
        .await?;
    let drills: Vec<VideoDrill> = cursor.try_collect().await?;

    Ok(Json(drills))
}

/// GET /admin/video-drills/:id
pub async fn get_video_drill(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| AppError::NotFound("Invalid ID".to_string()))?;
    let collection: Collection<VideoDrill> =
        state.db.database("rustapi").collection(COLLECTION);

    let drill = collection
        .find_one(doc! { "_id": oid })
        .await?
        .ok_or(AppError::NotFound("Video drill not found".to_string()))?;

    Ok(Json(drill))
}

/// PUT /admin/video-drills/:id
pub async fn update_video_drill(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateVideoDrillRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| AppError::NotFound("Invalid ID".to_string()))?;
    let collection: Collection<VideoDrill> =
        state.db.database("rustapi").collection(COLLECTION);

    let mut update = doc! { "updated_at": bson::DateTime::now() };

    if let Some(v) = payload.title {
        update.insert("title", v);
    }
    if let Some(v) = payload.topic {
        update.insert("topic", v);
    }
    if let Some(v) = payload.level {
        update.insert("level", v);
    }
    if let Some(lid) = payload.lesson_id {
        if lid.trim().is_empty() {
            update.insert("lesson_id", bson::Bson::Null);
        } else if let Ok(oid) = ObjectId::parse_str(&lid) {
            update.insert("lesson_id", oid);
        }
    }
    if let Some(steps) = payload.steps {
        let bson_steps = bson::to_bson(&steps)
            .map_err(|_| AppError::InternalServerError)?;
        update.insert("steps", bson_steps);
    }

    let result = collection
        .update_one(doc! { "_id": oid }, doc! { "$set": update })
        .await?;
    if result.matched_count == 0 {
        return Err(AppError::NotFound("Video drill not found".to_string()));
    }

    let updated = collection
        .find_one(doc! { "_id": oid })
        .await?
        .ok_or(AppError::NotFound("Video drill not found".to_string()))?;

    Ok(Json(updated))
}

/// DELETE /admin/video-drills/:id
pub async fn delete_video_drill(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| AppError::NotFound("Invalid ID".to_string()))?;
    let collection: Collection<VideoDrill> =
        state.db.database("rustapi").collection(COLLECTION);

    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 {
        return Err(AppError::NotFound("Video drill not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "message": "Video drill deleted" })))
}

// ==================== STUDENT ENDPOINTS ====================

/// GET /student/video-drills/:id
/// Fetches a drill for playback, resolving auto-distractors at serve time.
pub async fn student_get_drill(
    State(state): State<Arc<AppState>>,
    _user: User,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id)
        .map_err(|_| AppError::NotFound("Invalid ID".to_string()))?;
    let collection: Collection<VideoDrill> =
        state.db.database("rustapi").collection(COLLECTION);

    let mut drill = collection
        .find_one(doc! { "_id": oid })
        .await?
        .ok_or(AppError::NotFound("Video drill not found".to_string()))?;

    // Resolve auto-distractors for pick steps
    resolve_auto_distractors(&state, &mut drill).await;

    Ok(Json(drill))
}

/// POST /student/video-drills/:id/submit
/// Submits answers, calculates XP, creates a result record.
pub async fn student_submit_drill(
    State(state): State<Arc<AppState>>,
    user: User,
    Path(id): Path<String>,
    Json(payload): Json<SubmitVideoDrillRequest>,
) -> Result<impl IntoResponse, AppError> {
    let drill_oid = ObjectId::parse_str(&id)
        .map_err(|_| AppError::NotFound("Invalid ID".to_string()))?;
    let user_id = user.id.ok_or(AppError::InternalServerError)?;

    // Calculate accuracy
    let total_pick_steps = payload.answers.len() as f64;
    let accuracy = if total_pick_steps > 0.0 {
        (payload.correct_answers as f64 / total_pick_steps) * 100.0
    } else {
        100.0
    };

    // XP: base 10 per correct answer, with possible multiplier from session config
    let xp_earned = (payload.correct_answers as i64) * 10;

    // Collect words to review (incorrect answers)
    let words_to_review: Vec<String> = payload
        .answers
        .iter()
        .filter(|a| !a.is_correct)
        .map(|a| a.selected.clone())
        .collect();

    let words_learned = payload.correct_answers;

    // Save result record
    let results_col: Collection<VideoDrillResult> =
        state.db.database("rustapi").collection(RESULTS_COLLECTION);

    let result_record = VideoDrillResult {
        id: None,
        user_id,
        drill_id: drill_oid,
        score: accuracy,
        steps_completed: payload.steps_completed,
        correct_answers: payload.correct_answers,
        time_spent_seconds: payload.time_spent_seconds,
        created_at: Utc::now(),
    };

    results_col.insert_one(result_record).await?;

    // Award XP via existing progress system
    if xp_earned > 0 {
        let _ = crate::progress::handlers::add_xp(
            State(state.clone()),
            user,
            Json(crate::progress::models::AddXPRequest {
                xp: xp_earned,
                lesson_id: None,
                quiz_id: None,
            }),
        )
        .await;
    }

    Ok(Json(VideoDrillResultResponse {
        xp_earned,
        accuracy_percent: accuracy,
        words_learned,
        words_to_review,
    }))
}

// ==================== HELPERS ====================

/// Resolves auto-distractors for pick steps by sampling from the vocab pool.
/// Uses a simple time-based shuffle to avoid requiring the `rand` crate.
async fn resolve_auto_distractors(state: &AppState, drill: &mut VideoDrill) {
    use crate::vocab::models::VocabWord;

    let vocab_col: Collection<VocabWord> =
        state.db.database("rustapi").collection("vocab_words");

    // Try to get words from the vocab pool
    let topic_filter = doc! { "word": { "$exists": true } };
    let all_words: Vec<String> = match vocab_col.find(topic_filter).await {
        Ok(cursor) => match cursor.try_collect::<Vec<VocabWord>>().await {
            Ok(words) => words.into_iter().map(|w| w.word).collect(),
            Err(_) => return,
        },
        Err(_) => return,
    };

    // Simple time-based seed for shuffling
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as usize;

    for (step_idx, step) in drill.steps.iter_mut().enumerate() {
        if !step.auto_distractors || !step.distractors.is_empty() {
            continue;
        }

        // Filter out the target word
        let candidates: Vec<&String> = all_words
            .iter()
            .filter(|w| w.to_lowercase() != step.target_text.to_lowercase())
            .collect();

        if candidates.is_empty() {
            continue;
        }

        // Deterministic-ish sampling using seed + step index
        let mut indices: Vec<usize> = (0..candidates.len()).collect();
        // Simple Fisher-Yates-like shuffle with our seed
        let len = indices.len();
        for i in (1..len).rev() {
            let j = (seed.wrapping_add(step_idx).wrapping_mul(i + 1).wrapping_add(i * 7)) % (i + 1);
            indices.swap(i, j);
        }

        step.distractors = indices
            .into_iter()
            .take(3)
            .map(|i| candidates[i].clone())
            .collect();
    }
}
