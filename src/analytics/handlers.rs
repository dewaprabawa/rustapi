use axum::{
    extract::{State, Json},
    response::IntoResponse,
};
use mongodb::Collection;
use crate::analytics::models::*;
use crate::models::User;
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use chrono::Utc;

/// POST /api/analytics/track — Track a user event
pub async fn track_event(
    State(state): State<Arc<AppState>>,
    user_opt: Option<User>,
    Json(payload): Json<TrackEventRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<UserEvent> = state.db.database("rustapi").collection("user_events");

    let event = UserEvent {
        id: None,
        user_id: user_opt.and_then(|u| u.id),
        event_name: payload.event_name,
        properties: payload.properties,
        created_at: Utc::now(),
    };

    collection.insert_one(event).await?;
    
    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// GET /admin/analytics — List recent events (Admin only)
pub async fn list_events(
    State(state): State<Arc<AppState>>,
    _admin: crate::models::Admin,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<UserEvent> = state.db.database("rustapi").collection("user_events");
    let options = mongodb::options::FindOptions::builder()
        .sort(mongodb::bson::doc! { "created_at": -1 })
        .limit(100)
        .build();
    
    let cursor = collection.find(mongodb::bson::doc! {}).with_options(options).await?;
    let events: Vec<UserEvent> = futures::TryStreamExt::try_collect(cursor).await?;
    
    Ok(Json(events))
}
