use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub enum SpeakUpType {
    #[serde(rename = "shadowing")]
    Shadowing,
    #[serde(rename = "expansion")]
    Expansion,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpeakUpContent {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub content_type: SpeakUpType,
    pub difficulty: String, // A1, A2, B1
    pub title: String,
    pub title_id: Option<String>,
    pub transcript: String,
    pub transcript_id: Option<String>,
    pub audio_url: Option<String>, // Required for shadowing
    pub steps: Option<Vec<String>>, // Required for expansion
    pub target_wpm: i32,
    #[serde(with = "crate::models::resilient_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "crate::models::resilient_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct CreateSpeakUpContentRequest {
    pub content_type: SpeakUpType,
    pub difficulty: String,
    pub title: String,
    pub title_id: Option<String>,
    pub transcript: String,
    pub transcript_id: Option<String>,
    pub audio_url: Option<String>,
    pub steps: Option<Vec<String>>,
    pub target_wpm: Option<i32>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl Default for CreateSpeakUpContentRequest {
    fn default() -> Self {
        Self {
            content_type: SpeakUpType::Shadowing,
            difficulty: "A1".to_string(),
            title: "".to_string(),
            title_id: None,
            transcript: "".to_string(),
            transcript_id: None,
            audio_url: None,
            steps: None,
            target_wpm: Some(120),
            created_at: None,
            updated_at: None,
        }
    }
}

#[derive(Debug, Deserialize, Default)]
#[serde(default)]
pub struct UpdateSpeakUpContentRequest {
    pub content_type: Option<SpeakUpType>,
    pub difficulty: Option<String>,
    pub title: Option<String>,
    pub title_id: Option<String>,
    pub transcript: Option<String>,
    pub transcript_id: Option<String>,
    pub audio_url: Option<String>,
    pub steps: Option<Vec<String>>,
    pub target_wpm: Option<i32>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WordTiming {
    pub word: String,
    pub start_time: f64,
    pub end_time: f64,
    pub confidence: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpeakUpAnalysis {
    pub pronunciation_score: f64,
    pub pace_wpm: f64,
    pub fluency_score: f64,
    pub hesitations: Vec<f64>, // Timestamps of detected hesitations
    pub feedback_text: String,
    pub word_timings: Vec<WordTiming>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpeakUpSession {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub content_id: ObjectId,
    pub analysis: SpeakUpAnalysis,
    pub audio_recording_url: Option<String>,
    pub created_at: DateTime<Utc>,
}
