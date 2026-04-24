use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};

// ============ Lesson Rating ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LessonRating {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub lesson_id: ObjectId,
    pub rating: i32,     // e.g., 1 to 5 stars
    pub liked: bool,     // Thumbs up / down alternative
    pub feedback: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitRatingRequest {
    pub lesson_id: String,
    pub rating: Option<i32>,
    pub liked: Option<bool>,
    pub feedback: Option<String>,
}

// ============ Lesson Stats (Aggregated) ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LessonStats {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub lesson_id: ObjectId,
    pub avg_rating: f64,
    pub total_ratings: i32,
    pub total_plays: i32,
    pub completion_rate: f64, // percentage
    pub popularity_score: f64,
    pub updated_at: DateTime<Utc>,
}
