use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};

// ─── Step Type ─────────────────────────────────────────────────────

/// Defines the type of step within a video drill sequence.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum VideoDrillStepType {
    /// Student watches/listens — no interaction required
    Watch,
    /// Student picks the correct word from multiple choices
    PickWord,
    /// Student picks the correct sentence from multiple choices
    PickSentence,
    /// Student fills in the blank in a sentence (e.g., "What is your _____?")
    FillBlank,
    /// Student plays a mini-game from the gamification engine
    PlayGame,
}

// ─── Step ──────────────────────────────────────────────────────────

/// A single step in a video drill sequence.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoDrillStep {
    pub order: i32,
    pub step_type: VideoDrillStepType,
    /// The word or sentence being taught/tested
    pub target_text: String,
    /// Bahasa Indonesia translation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_translation: Option<String>,
    /// Admin-uploaded video URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,
    /// Image URL (alternative to video — pairs with audio_url)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    /// Fallback audio URL (or TTS if both absent)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,
    /// Wrong answer choices for Pick steps
    #[serde(default)]
    pub distractors: Vec<String>,
    /// If true, system auto-generates distractors from the topic pool
    #[serde(default)]
    pub auto_distractors: bool,
    /// Optional link to an existing VocabWord for progress tracking
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vocab_word_id: Option<ObjectId>,
    /// Sentence with blank (e.g., "What is your _____?") — used by FillBlank step type
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub blank_sentence: Option<String>,
    /// Link to a Game instance — used by PlayGame step type
    #[serde(skip_serializing_if = "Option::is_none")]
    pub game_id: Option<ObjectId>,
}

// ─── Video Drill ───────────────────────────────────────────────────

/// A complete video drill containing an ordered sequence of steps.
/// Collection: "video_drills"
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoDrill {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub topic: String,
    pub level: String,
    /// Optional lesson linkage for lesson-specific drills
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lesson_id: Option<ObjectId>,
    pub steps: Vec<VideoDrillStep>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

// ─── Admin Request/Response DTOs ───────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateVideoDrillRequest {
    pub title: String,
    pub topic: String,
    pub level: String,
    pub lesson_id: Option<String>,
    pub steps: Vec<VideoDrillStep>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVideoDrillRequest {
    pub title: Option<String>,
    pub topic: Option<String>,
    pub level: Option<String>,
    pub lesson_id: Option<String>,
    pub steps: Option<Vec<VideoDrillStep>>,
}

// ─── Student DTOs ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct VideoDrillStepAnswer {
    pub step_index: i32,
    pub selected: String,
    pub is_correct: bool,
}

#[derive(Debug, Deserialize)]
pub struct SubmitVideoDrillRequest {
    pub steps_completed: i32,
    pub correct_answers: i32,
    pub time_spent_seconds: i32,
    pub answers: Vec<VideoDrillStepAnswer>,
}

#[derive(Debug, Serialize)]
pub struct VideoDrillResultResponse {
    pub xp_earned: i64,
    pub accuracy_percent: f64,
    pub words_learned: i32,
    pub words_to_review: Vec<String>,
}

// ─── Result Record ─────────────────────────────────────────────────

/// Stores the outcome of a student's video drill attempt.
/// Collection: "video_drill_results"
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoDrillResult {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub drill_id: ObjectId,
    pub score: f64,
    pub steps_completed: i32,
    pub correct_answers: i32,
    pub time_spent_seconds: i32,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}

// ─── Query Params ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct VideoDrillQuery {
    pub topic: Option<String>,
    pub level: Option<String>,
    pub lesson_id: Option<String>,
}
