use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use mongodb::bson::DateTime;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VocabSet {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub topic: String,
    pub level: String,
    pub language: String,
    pub word_count: i32,
    pub game_types: Vec<String>,
    pub related_topics: Vec<String>,
    pub status: String,
    pub created_by: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_at: Option<DateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VocabWord {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub set_id: ObjectId,
    pub word: String,
    pub translation: String,
    pub part_of_speech: String,
    pub definition: String,
    pub pronunciation_guide: String,
    pub colloquial_usage: String,
    pub example_sentence: String,
    pub distractors: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,
    pub position: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserVocabProgress {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: String,
    pub set_id: ObjectId,
    pub word_id: ObjectId,
    pub game_type: String,
    pub status: String, // unseen, learning, mastered
    pub is_bookmarked: bool,
    pub ease_factor: f64,
    pub interval_days: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_review: Option<DateTime>,
    pub correct_count: i32,
    pub attempt_count: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_reviewed_at: Option<DateTime>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversationRequest {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: String,
    pub target_vocab: Vec<ObjectId>,
    pub context_note: String,
    pub status: String, // pending, approved, generated, rejected
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario_id: Option<ObjectId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved_at: Option<DateTime>,
}
