use axum::{
    extract::{State, Json, Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::models::{User, Admin, Notification, NotificationRequest, PaginationParams, PaginatedResponse};
use crate::handlers::{AppError, AppState};
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;
use mongodb::options::FindOptions;
use futures::TryStreamExt;

/// POST /admin/notifications (Admin only)
pub async fn send_notification(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<NotificationRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Notification> = state.db.database("rustapi").collection("notifications");

    let user_id = if let Some(id_str) = payload.user_id {
        Some(ObjectId::parse_str(&id_str).map_err(|_| AppError::NotFound)?)
    } else {
        None
    };

    let notification = Notification {
        id: None,
        user_id,
        title: payload.title,
        message: payload.message,
        is_read: false,
        created_at: Utc::now(),
    };

    let result = collection.insert_one(notification.clone()).await?;
    let mut saved_notification = notification;
    saved_notification.id = Some(result.inserted_id.as_object_id().unwrap());

    Ok((StatusCode::CREATED, Json(saved_notification)))
}

/// GET /api/notifications (User)
pub async fn list_notifications(
    State(state): State<Arc<AppState>>,
    user: User,
    Query(params): Query<PaginationParams>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Notification> = state.db.database("rustapi").collection("notifications");

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let skip = (page - 1) * limit as u64;

    // Filter by either user_id or broadcast (user_id is null)
    let filter = doc! {
        "$or": [
            { "user_id": user.id.unwrap() },
            { "user_id": mongodb::bson::Bson::Null },
        ]
    };

    let total = collection.count_documents(filter.clone()).await? as u64;

    let options = FindOptions::builder()
        .skip(skip)
        .limit(limit)
        .sort(doc! { "created_at": -1 })
        .build();

    let cursor = collection.find(filter).with_options(options).await?;
    let notifications: Vec<Notification> = cursor.try_collect().await?;

    Ok(Json(PaginatedResponse {
        data: notifications,
        page,
        limit,
        total,
    }))
}

/// PUT /api/notifications/:id/read (User)
pub async fn mark_notification_read(
    State(state): State<Arc<AppState>>,
    user: User,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let notification_id = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Notification> = state.db.database("rustapi").collection("notifications");

    // Can only mark own notifications as read
    let result = collection.update_one(
        doc! { "_id": notification_id, "user_id": user.id.unwrap() },
        doc! { "$set": { "is_read": true } }
    ).await?;

    if result.matched_count == 0 {
        return Err(AppError::NotFound);
    }

    Ok(Json(serde_json::json!({"message": "Notification marked as read"})))
}
