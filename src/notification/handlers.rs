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

// ==================== FCM Push via Firebase Admin SDK ====================

/// Sends a push notification to a single device using FCM HTTP v1 API.
/// Authenticates via the Firebase Admin service account (gcp_auth reads
/// GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON).
pub async fn send_fcm_notification(
    fcm_token: &str,
    title: &str,
    body: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let auth = gcp_auth::provider().await?;
    let scopes = &["https://www.googleapis.com/auth/firebase.messaging"];
    let token = auth.token(scopes).await?;

    // Project ID matches the Firebase service account JSON
    let project_id = "rustapi-34bbb";
    let url = format!(
        "https://fcm.googleapis.com/v1/projects/{}/messages:send",
        project_id
    );

    let payload = serde_json::json!({
        "message": {
            "token": fcm_token,
            "notification": {
                "title": title,
                "body": body,
            }
        }
    });

    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token.as_str()))
        .json(&payload)
        .send()
        .await?;

    let status = res.status();
    if !status.is_success() {
        let error_body = res.text().await.unwrap_or_default();
        println!("FCM error ({}): {}", status, error_body);
        return Err(format!("FCM returned {}: {}", status, error_body).into());
    }

    println!("FCM send success: {}", status);
    Ok(())
}

/// Helper: saves a notification to MongoDB AND sends an FCM push if the target
/// user has an fcm_token stored. Safe to call from any module.
pub async fn create_and_push_notification(
    db: &mongodb::Client,
    user_id: Option<ObjectId>,
    title: &str,
    message: &str,
) {
    let notif_col: Collection<Notification> =
        db.database("rustapi").collection("notifications");

    let notification = Notification {
        id: None,
        user_id,
        title: title.to_string(),
        message: message.to_string(),
        is_read: false,
        created_at: Utc::now(),
    };

    // Save to DB
    if let Err(e) = notif_col.insert_one(notification).await {
        println!("Failed to save notification: {:?}", e);
        return;
    }

    // Send FCM push
    match user_id {
        Some(uid) => {
            // Targeted notification → look up the user's FCM token
            let users_col: Collection<User> =
                db.database("rustapi").collection("users");
            if let Ok(Some(user)) = users_col.find_one(doc! { "_id": uid }).await {
                if let Some(ref fcm_token) = user.fcm_token {
                    if let Err(e) = send_fcm_notification(fcm_token, title, message).await {
                        println!("FCM push failed for user {}: {:?}", uid, e);
                    }
                }
            }
        }
        None => {
            // Broadcast → send to ALL users who have an fcm_token
            let users_col: Collection<User> =
                db.database("rustapi").collection("users");
            if let Ok(mut cursor) = users_col
                .find(doc! { "fcm_token": { "$ne": null } })
                .await
            {
                while let Ok(Some(user)) = cursor.try_next().await {
                    if let Some(ref fcm_token) = user.fcm_token {
                        let t = title.to_string();
                        let m = message.to_string();
                        let token = fcm_token.clone();
                        // Fire-and-forget per device so one failure doesn't block others
                        tokio::spawn(async move {
                            if let Err(e) = send_fcm_notification(&token, &t, &m).await {
                                println!("Broadcast FCM failed: {:?}", e);
                            }
                        });
                    }
                }
            }
        }
    }
}

// ==================== Admin Endpoints ====================

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
        title: payload.title.clone(),
        message: payload.message.clone(),
        is_read: false,
        created_at: Utc::now(),
    };

    let result = collection.insert_one(notification.clone()).await?;
    let mut saved_notification = notification;
    saved_notification.id = Some(result.inserted_id.as_object_id().unwrap());

    // Send FCM push in background
    let title = payload.title.clone();
    let message = payload.message.clone();
    let db = state.db.clone();

    tokio::spawn(async move {
        match user_id {
            Some(uid) => {
                // Targeted push
                let users_collection: Collection<User> =
                    db.database("rustapi").collection("users");
                if let Ok(Some(target_user)) =
                    users_collection.find_one(doc! { "_id": uid }).await
                {
                    if let Some(fcm_token) = target_user.fcm_token {
                        if let Err(e) =
                            send_fcm_notification(&fcm_token, &title, &message).await
                        {
                            println!("Failed to send FCM: {:?}", e);
                        }
                    }
                }
            }
            None => {
                // Broadcast push to all users with FCM tokens
                let users_collection: Collection<User> =
                    db.database("rustapi").collection("users");
                if let Ok(mut cursor) = users_collection
                    .find(doc! { "fcm_token": { "$ne": null } })
                    .await
                {
                    while let Ok(Some(user)) = cursor.try_next().await {
                        if let Some(ref fcm_token) = user.fcm_token {
                            let t = title.clone();
                            let m = message.clone();
                            let token = fcm_token.clone();
                            tokio::spawn(async move {
                                if let Err(e) =
                                    send_fcm_notification(&token, &t, &m).await
                                {
                                    println!("Broadcast FCM failed: {:?}", e);
                                }
                            });
                        }
                    }
                }
            }
        }
    });

    Ok((StatusCode::CREATED, Json(saved_notification)))
}

// ==================== User Endpoints ====================

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
