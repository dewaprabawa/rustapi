use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};

// ============ User Progress ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserProgress {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub xp: i64,
    pub level: i32,
    pub streak_days: i32,
    #[serde(default, skip_serializing_if = "Option::is_none", with = "crate::models::optional_bson_datetime")]
    pub last_activity_date: Option<DateTime<Utc>>,
    pub completed_lessons: Vec<ObjectId>,
    pub completed_quizzes: Vec<ObjectId>,
    pub interview_count: i32,
    pub average_interview_score: f64,
    pub streak_freezes: i32,
    pub current_unit: i32,
    pub current_lesson_node: i32,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AddXPRequest {
    pub xp: i64,
    pub lesson_id: Option<String>,
    pub quiz_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct XPResponse {
    pub xp: i64,
    pub level: i32,
    pub level_up: bool,
    pub streak_days: i32,
}

// ============ Gamification Config (Admin-managed) ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GamificationConfig {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    #[serde(default)] pub xp_per_lesson: i64,
    #[serde(default)] pub xp_per_quiz: i64,
    #[serde(default)] pub xp_per_interview: i64,
    #[serde(default)] pub streak_bonus_xp: i64,
    #[serde(default)] pub max_streak_freezes: i32,
    pub level_thresholds: Vec<LevelThreshold>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LevelThreshold {
    pub level: i32,
    pub min_xp: i64,
    pub title: String,       // e.g. "Beginner", "Intermediate"
    pub title_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGamificationRequest {
    pub xp_per_lesson: Option<i64>,
    pub xp_per_quiz: Option<i64>,
    pub xp_per_interview: Option<i64>,
    pub streak_bonus_xp: Option<i64>,
    pub max_streak_freezes: Option<i32>,
    pub level_thresholds: Option<Vec<LevelThreshold>>,
}

// ============ Lesson Completion Record ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LessonCompletion {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub lesson_id: ObjectId,
    pub xp_earned: i64,
    pub completed_at: DateTime<Utc>,
}

// ============ Quiz Attempt ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuizAttempt {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub quiz_id: ObjectId,
    pub score: f64,           // percentage 0-100
    pub passed: bool,
    pub answers: Vec<QuizAnswer>,
    pub xp_earned: i64,
    pub completed_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuizAnswer {
    pub question_index: usize,
    pub selected_answer: usize,
    pub is_correct: bool,
}

#[derive(Debug, Deserialize)]
pub struct SubmitQuizRequest {
    pub quiz_id: String,
    pub answers: Vec<usize>, // selected option indices
}
