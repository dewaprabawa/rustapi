use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};

// ============ Feature Access ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeatureAccess {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub feature_name: String, // e.g. "ai_interview", "premium_lessons", "certification"
    pub is_premium: bool,
    pub description: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFeatureAccessRequest {
    pub is_premium: Option<bool>,
    pub description: Option<String>,
}

// ============ AI Usage Limit ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIUsage {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub date: String, // YYYY-MM-DD format for simple daily tracking
    pub used_today: i32,
    pub daily_limit: i32, // Defaults to a config value
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============ Global Config for AI Limits ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIUsageConfig {
    #[serde(rename = "_id", skip_skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub free_tier_daily_limit: i32,
    pub premium_tier_daily_limit: i32,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAIUsageConfigRequest {
    pub free_tier_daily_limit: Option<i32>,
    pub premium_tier_daily_limit: Option<i32>,
}
