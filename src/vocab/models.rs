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
    #[serde(default = "default_set_type")]
    pub set_type: String, // "vocabulary", "phrasal_verbs", "collocations"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_at: Option<DateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub example_dialogue: Option<Vec<VocabDialogueLine>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branching_tree: Option<serde_json::Value>,
}

fn default_set_type() -> String {
    "vocabulary".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VocabDialogueLine {
    pub speaker: String,
    pub text_en: String,
    pub text_id: String,
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
    pub item_dialogue: Option<Vec<VocabDialogueLine>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,
    pub position: i32,
    #[serde(default = "default_card_type")]
    pub card_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emoji: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emotion: Option<String>,
}

fn default_card_type() -> String {
    "vocabulary".to_string()
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
#[derive(Debug, Deserialize)]
pub struct UpdateVocabSetRequest {
    pub title: Option<String>,
    pub topic: Option<String>,
    pub level: Option<String>,
    pub status: Option<String>,
    pub related_topics: Option<Vec<String>>,
    pub example_dialogue: Option<Vec<VocabDialogueLine>>,
    pub branching_tree: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_id: Option<ObjectId>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VocabGroup {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub description: String,
    pub topic: String,
    pub level: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pos_type: Option<String>, // e.g., "verb", "noun", "adjective"
    #[serde(default)]
    pub color_theme: String,      // hex or CSS class
    #[serde(default)]
    pub icon: String,             // lucide icon name
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVocabWordRequest {
    pub word: Option<String>,
    pub translation: Option<String>,
    pub part_of_speech: Option<String>,
    pub definition: Option<String>,
    pub pronunciation_guide: Option<String>,
    pub colloquial_usage: Option<String>,
    pub example_sentence: Option<String>,
    pub distractors: Option<Vec<String>>,
    pub item_dialogue: Option<Vec<VocabDialogueLine>>,
    pub card_type: Option<String>,
    pub emoji: Option<String>,
    pub emotion: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateVocabRequest {
    pub topic: String,
    pub level: String,
    pub word_count: i32,
    pub language: String,
    pub set_type: String,
    pub part_of_speech: Option<String>, // New: target specific POS
}
