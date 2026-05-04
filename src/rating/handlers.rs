use axum::{
    extract::{State, Json, Query},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::rating::models::*;
use crate::models::{User, PaginationParams, PaginatedResponse};
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use bson::oid::ObjectId;
use futures::TryStreamExt;
use mongodb::options::FindOptions;

// ==================== USER ENDPOINTS ====================

/// POST /ratings/lessons
pub async fn submit_lesson_rating(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<SubmitRatingRequest>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&payload.lesson_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let user_id = user.id.unwrap();

    let collection: Collection<LessonRating> = state.db.database("rustapi").collection("lesson_ratings");

    // Upsert rating
    let filter = doc! { "user_id": user_id, "lesson_id": lesson_id };
    
    let mut update = doc! {
        "updated_at": bson::DateTime::now()
    };
    
    if let Some(r) = payload.rating { update.insert("rating", r); }
    if let Some(l) = payload.liked { update.insert("liked", l); }
    if let Some(f) = payload.feedback.clone() { update.insert("feedback", f); }

    let options = mongodb::options::UpdateOptions::builder().upsert(true).build();

    let _result = collection.update_one(
        filter.clone(),
        doc! { 
            "$set": update,
            "$setOnInsert": { "created_at": bson::DateTime::now() } 
        }
    ).with_options(options).await?;

    // Optionally: Update LessonStats asynchronously (or synchronously here)
    update_lesson_stats(&state, lesson_id).await;

    Ok((StatusCode::OK, Json(serde_json::json!({ "message": "Rating submitted" }))))
}

// ==================== ADMIN ENDPOINTS ====================

/// GET /admin/ratings
pub async fn list_ratings(
    State(state): State<Arc<AppState>>,
    _admin: crate::models::Admin,
    Query(params): Query<PaginationParams>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<LessonRating> = state.db.database("rustapi").collection("lesson_ratings");

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(50).min(100);
    let skip = (page - 1) * limit as u64;
    let total = collection.count_documents(doc! {}).await? as u64;

    let options = FindOptions::builder()
        .skip(skip).limit(limit).sort(doc! { "created_at": -1 }).build();

    let cursor = collection.find(doc! {}).with_options(options).await?;
    let data: Vec<LessonRating> = cursor.try_collect().await?;

    Ok(Json(PaginatedResponse { data, page, limit, total }))
}

// ==================== HELPERS ====================

async fn update_lesson_stats(state: &Arc<AppState>, lesson_id: ObjectId) {
    let collection: Collection<LessonRating> = state.db.database("rustapi").collection("lesson_ratings");
    
    if let Ok(mut cursor) = collection.find(doc! { "lesson_id": lesson_id }).await {
        let mut total_ratings = 0;
        let mut sum_rating = 0;
        let mut likes = 0;

        while let Ok(Some(rating)) = cursor.try_next().await {
            total_ratings += 1;
            sum_rating += rating.rating;
            if rating.liked { likes += 1; }
        }

        let avg_rating = if total_ratings > 0 { sum_rating as f64 / total_ratings as f64 } else { 0.0 };
        let popularity = if total_ratings > 0 { likes as f64 / total_ratings as f64 } else { 0.0 };

        let stats_coll: Collection<LessonStats> = state.db.database("rustapi").collection("lesson_stats");
        
        let update = doc! {
            "$set": {
                "avg_rating": avg_rating,
                "total_ratings": total_ratings,
                "popularity_score": popularity,
                "updated_at": bson::DateTime::now()
            }
        };
        
        let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
        let _ = stats_coll.update_one(doc! { "lesson_id": lesson_id }, update).with_options(options).await;
    }
}
