use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use crate::content_models::ContentCategory;

// ============ Interview Scenario ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InterviewScenario {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub description: String,
    pub role: String,            // e.g. "HR Manager", "Restaurant Manager"
    pub tone: String,            // e.g. "formal", "friendly", "strict"
    pub difficulty: String,      // "easy", "medium", "hard"
    pub category: ContentCategory,
    pub prompt_template: String, // System prompt for OpenAI
    pub max_questions: i32,
    pub time_limit_minutes: Option<i32>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateScenarioRequest {
    pub title: String,
    pub description: String,
    pub role: String,
    pub tone: String,
    pub difficulty: String,
    pub category: ContentCategory,
    pub prompt_template: String,
    pub max_questions: Option<i32>,
    pub time_limit_minutes: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateScenarioRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub role: Option<String>,
    pub tone: Option<String>,
    pub difficulty: Option<String>,
    pub category: Option<ContentCategory>,
    pub prompt_template: Option<String>,
    pub max_questions: Option<i32>,
    pub time_limit_minutes: Option<i32>,
    pub is_active: Option<bool>,
}

// ============ Interview Question ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InterviewQuestion {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub scenario_id: ObjectId,
    pub question: String,
    pub expected_keywords: Vec<String>, // For scoring
    pub example_answer: Option<String>,
    pub order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuestionRequest {
    pub scenario_id: String,
    pub question: String,
    pub expected_keywords: Vec<String>,
    pub example_answer: Option<String>,
    pub order: Option<i32>,
}

// ============ Interview Session (User-facing) ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InterviewSession {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub scenario_id: ObjectId,
    pub score: Option<f64>,          // 0.0 - 100.0
    pub pronunciation_score: Option<f64>,
    pub grammar_score: Option<f64>,
    pub fluency_score: Option<f64>,
    pub transcript: Vec<TranscriptEntry>,
    pub feedback: Option<String>,    // AI-generated feedback
    pub duration_seconds: Option<i32>,
    pub completed: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranscriptEntry {
    pub role: String,      // "interviewer" or "user"
    pub content: String,
    pub timestamp: Option<DateTime<Utc>>,
}

// ============ AI Prompt Configuration ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIConfig {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub config_key: String,          // e.g. "interview_system_prompt"
    pub value: String,
    pub description: String,
    pub is_active: bool,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAIConfigRequest {
    pub value: Option<String>,
    pub description: Option<String>,
    pub is_active: Option<bool>,
}

// ============ Speaking Evaluation Weights ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EvaluationWeights {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub pronunciation_weight: f64, // 0.0 - 1.0
    pub grammar_weight: f64,
    pub fluency_weight: f64,
    pub vocabulary_weight: f64,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWeightsRequest {
    pub pronunciation_weight: Option<f64>,
    pub grammar_weight: Option<f64>,
    pub fluency_weight: Option<f64>,
    pub vocabulary_weight: Option<f64>,
}
