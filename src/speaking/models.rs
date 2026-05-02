use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use crate::content::models::{ContentLevel, ContentCategory};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpeakingTurn {
    pub role: String, // "user" or "ai"
    pub transcript: String,
    pub audio_url: Option<String>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpeakingSession {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub lesson_id: Option<ObjectId>,
    pub scenario_id: Option<ObjectId>,
    pub topic: String,
    pub level: ContentLevel,
    pub category: ContentCategory,
    pub turns: Vec<SpeakingTurn>,
    pub status: String, // "active", "completed", "aborted"
    pub xp_awarded: Option<i32>,
    pub scores: Option<SessionScores>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionScores {
    pub fluency: i32,
    pub grammar: i32,
    pub vocabulary: i32,
    pub politeness: i32,
    pub task_completion: i32,
    pub overall_score: i32,
    pub feedback_notes: String,
    pub grammar_corrections: Vec<GrammarCorrection>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GrammarCorrection {
    pub original_text: String,
    pub corrected_text: String,
    pub explanation: String,
}

#[derive(Debug, Deserialize)]
pub struct StartSessionRequest {
    pub lesson_id: Option<String>,
    pub scenario_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SessionTurnRequest {
    pub transcript: String,
}

#[derive(Debug, Serialize)]
pub struct SessionTurnResponse {
    pub ai_reply: String,
    pub audio_bytes: Option<Vec<u8>>,
    pub is_complete: bool,
}
