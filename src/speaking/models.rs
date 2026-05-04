use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use crate::content::models::ContentLevel;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpeakingScenario {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub lesson_id: Option<ObjectId>, // Linked to a specific lesson
    pub title: String,
    pub description: String,
    pub role_ai: String,         // e.g. "Front Desk Agent"
    pub role_user: String,       // e.g. "Guest"
    pub context: String,         // "Checking into a hotel at night"
    pub level: ContentLevel,
    pub initial_message: String, // AI's first line
    pub target_vocabulary: Vec<String>, // Words user should try to use
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpeakingSession {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub scenario_id: ObjectId,
    pub status: String,          // "active", "completed"
    pub turns: Vec<SpeakingTurn>,
    pub overall_score: Option<f64>,
    pub detailed_scores: Option<DetailedScores>,
    pub feedback: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetailedScores {
    pub pronunciation: f64,
    pub grammar: f64,
    pub vocabulary: f64,
    pub fluency: f64,
    pub task_completion: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpeakingTurn {
    pub role: String,            // "ai" or "user"
    pub content: String,         // transcribed text or AI question
    pub audio_url: Option<String>,
    pub evaluation: Option<TurnEvaluation>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TurnEvaluation {
    pub score: f64,              // 0-100
    pub pronunciation_score: Option<f64>,
    pub grammar_score: Option<f64>,
    pub vocabulary_score: Option<f64>,
    pub better_answer: Option<String>, // Rephrased/Improved version of user's input
    pub feedback: Option<String>,      // Specific feedback for this turn
}

#[derive(Debug, Deserialize)]
pub struct StartSessionRequest {
    pub scenario_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ProcessTurnRequest {
    pub text: Option<String>,    // If client already did STT
    pub voice_id: Option<String>, // Optional ElevenLabs voice
}
