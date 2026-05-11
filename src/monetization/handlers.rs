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
                free_tier_daily_limit: 20,
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

// ==================== USAGE ENFORCEMENT ====================

/// Checks if the user has reached their daily AI usage limit and increments if not.
/// Returns Ok(()) if allowed, or Err(AppError::Forbidden) if limit reached.
pub async fn check_and_increment_ai_usage(
    state: &Arc<AppState>,
    user: &crate::models::User,
) -> Result<(), AppError> {
    let user_id = user.id.unwrap();
    let usage_col: Collection<AIUsage> = state.db.database("rustapi").collection("ai_usage");
    let config_col: Collection<AIUsageConfig> = state.db.database("rustapi").collection("ai_usage_config");
    
    let today = Utc::now().format("%Y-%m-%d").to_string();
    
    // 1. Get usage config
    let config = config_col.find_one(doc! {}).await?.unwrap_or(AIUsageConfig {
        id: None,
        free_tier_daily_limit: 20,
        premium_tier_daily_limit: 100,
        updated_at: Utc::now(),
    });
    
    // 2. Determine limit based on user tier
    let limit = if user.is_premium {
        config.premium_tier_daily_limit
    } else {
        config.free_tier_daily_limit
    };

    // 3. Atomic find_one_and_update with quota check
    let options = mongodb::options::FindOneAndUpdateOptions::builder()
        .upsert(true)
        .return_document(mongodb::options::ReturnDocument::After)
        .build();

    let filter = doc! { 
        "user_id": user_id, 
        "date": &today,
        "used_today": { "$lt": limit } // Only increment if under limit
    };

    let update = doc! {
        "$inc": { "used_today": 1 },
        "$set": { "updated_at": bson::DateTime::now() },
        "$setOnInsert": {
            "created_at": bson::DateTime::now(),
            "daily_limit": limit
        }
    };

    let result = usage_col.find_one_and_update(filter, update).with_options(options).await?;

    if result.is_none() {
        // If no document was updated/inserted, it means the filter failed (limit reached)
        return Err(AppError::Forbidden("Daily AI limit reached. Upgrade to Plus for unlimited practice!".to_string()));
    }
    
    Ok(())
}
