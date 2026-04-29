use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GameType {
    RolePlay,
    Listening,
    PhraseBuilder,
    FixSentence,
    SpeedService,
    Pronunciation,
    WordScramble,
    Matching,
    Translation,
    FillInTheBlank,
    SceneMatcher,
    RespectMaster,
    VoiceStar,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameContent {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub module_id: Option<ObjectId>,
    pub lesson_id: ObjectId,
    pub game_type: GameType,
    pub title: String,
    pub instructions: String,
    pub difficulty: String, // easy, medium, hard
    pub asset_url: Option<String>, // URL for emojis, background images, or audio
    pub data_json: Value,   // Flexible JSON for game specifics
    pub ai_scenario_id: Option<ObjectId>, // Link to AI Scenario if role play
    pub xp_reward: i64,
    pub is_active: bool,
    pub order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGameRequest {
    pub module_id: Option<String>,
    pub lesson_id: String,
    pub game_type: GameType,
    pub title: String,
    pub instructions: String,
    pub difficulty: String,
    pub asset_url: Option<String>,
    pub data_json: Value,
    pub ai_scenario_id: Option<String>,
    pub xp_reward: Option<i64>,
    pub order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGameRequest {
    pub title: Option<String>,
    pub instructions: Option<String>,
    pub difficulty: Option<String>,
    pub asset_url: Option<String>,
    pub data_json: Option<Value>,
    pub ai_scenario_id: Option<String>,
    pub xp_reward: Option<i64>,
    pub is_active: Option<bool>,
    pub order: Option<i32>,
}

// ============ Game Results ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameResult {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub game_id: ObjectId,
    pub score: f64,
    pub attempts: i32,
    pub completed: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitGameResultRequest {
    pub game_id: String,
    pub score: f64,
    pub attempts: i32,
    pub completed: bool,
}

// ============ Speaking Results ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpeakingResult {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub game_id: Option<ObjectId>,
    pub sentence: String,
    pub score: f64,
    pub pronunciation_score: Option<f64>,
    pub fluency_score: Option<f64>,
    pub audio_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitSpeakingRequest {
    pub game_id: Option<String>,
    pub sentence: String,
    pub score: f64,
    pub pronunciation_score: Option<f64>,
    pub fluency_score: Option<f64>,
    pub audio_url: Option<String>,
}

// ============ Game Sessions ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameSession {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub game_id: ObjectId,
    pub status: String, // "active", "completed", "failed"
    pub lives: i32,
    pub current_xp: i64,
    pub started_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct StartSessionRequest {
    pub game_id: String,
}

#[derive(Debug, Deserialize)]
pub struct AnswerSubmitRequest {
    pub session_id: String,
    pub answer: Value, // Flexible payload for different game types
}

#[derive(Debug, Serialize)]
pub struct AnswerResultResponse {
    pub is_correct: bool,
    pub xp_earned: i64,
    pub lives_remaining: i32,
    pub status: String,
    pub feedback: Option<String>,
}

// ============ Offline Sync ============

#[derive(Debug, Deserialize)]
pub struct OfflineAnswer {
    pub game_id: String,
    pub answer: Value,
    pub is_correct: bool,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct OfflineSyncRequest {
    pub offline_answers: Vec<OfflineAnswer>,
}

#[derive(Debug, Serialize)]
pub struct OfflineSyncResponse {
    pub synced_count: usize,
    pub total_xp_awarded: i64,
}
