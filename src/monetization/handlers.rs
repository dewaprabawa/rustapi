use axum::{
    extract::{State, Json, Path},
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::monetization::models::*;
use crate::models::Admin;
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use chrono::Utc;
use futures::TryStreamExt;

// ==================== ADMIN ENDPOINTS ====================

/// GET /admin/features
pub async fn list_features(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<FeatureAccess> = state.db.database("rustapi").collection("feature_access");
    let cursor = collection.find(doc! {}).await?;
    let data: Vec<FeatureAccess> = cursor.try_collect().await?;
    Ok(Json(data))
}

/// PUT /admin/features/:name
pub async fn update_feature(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(name): Path<String>,
    Json(payload): Json<UpdateFeatureAccessRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<FeatureAccess> = state.db.database("rustapi").collection("feature_access");

    let mut update = doc! { "updated_at": bson::DateTime::now() };
    if let Some(v) = payload.is_premium { update.insert("is_premium", v); }
    if let Some(v) = payload.description { update.insert("description", v); }

    let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
    collection.update_one(doc! { "feature_name": &name }, doc! { "$set": update })
        .with_options(options).await?;

    let updated = collection.find_one(doc! { "feature_name": &name }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(updated))
}

/// GET /admin/monetization/config
pub async fn get_monetization_config(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<AIUsageConfig> = state.db.database("rustapi").collection("ai_usage_config");
    let config = collection.find_one(doc! {}).await?;

    match config {
        Some(c) => Ok(Json(c)),
        None => {
            let defaults = AIUsageConfig {
                id: None,
                free_tier_daily_limit: 5,
                premium_tier_daily_limit: 100,
                updated_at: Utc::now(),
            };
            collection.insert_one(defaults.clone()).await?;
            Ok(Json(defaults))
        }
    }
}

/// PUT /admin/monetization/config
pub async fn update_monetization_config(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<UpdateAIUsageConfigRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<AIUsageConfig> = state.db.database("rustapi").collection("ai_usage_config");

    let mut update = doc! { "updated_at": bson::DateTime::now() };
    if let Some(v) = payload.free_tier_daily_limit { update.insert("free_tier_daily_limit", v); }
    if let Some(v) = payload.premium_tier_daily_limit { update.insert("premium_tier_daily_limit", v); }

    let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
    collection.update_one(doc! {}, doc! { "$set": update })
        .with_options(options).await?;

    let updated = collection.find_one(doc! {}).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(updated))
}
