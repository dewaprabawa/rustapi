use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use crate::content::models::ContentLevel;
use crate::game::models::GameType;

// ─── Phase Type Enum ───────────────────────────────────────────────

/// Defines the type of phase within a learning session.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SessionPhaseType {
    /// Show lesson markdown content
    Read,
    /// Vocabulary flashcard intro
    Flashcard,
    /// Active recall mini-games from vocab
    VocabDrill,
    /// Existing game types (SceneMatcher, etc.)
    Game,
    /// Sentence pronunciation drills
    Pronunciation,
    /// AI roleplay conversation
    Conversation,
    /// Video-based watch and pick drill
    VideoDrill,
    /// Lesson objective/goal display
    Objective,
}

// ─── Per-Phase Configuration ───────────────────────────────────────

/// Configuration for a single phase within a session.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PhaseConfig {
    pub phase_type: SessionPhaseType,
    pub enabled: bool,
    pub order: i32,
    #[serde(default)]
    pub settings: PhaseSettings,
}

/// Phase-specific settings. Each phase reads only its relevant fields.
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct PhaseSettings {
    // ── Flashcard settings ──
    /// Auto-play TTS when card is shown
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_play_audio: Option<bool>,
    /// Show Bahasa Indonesia translation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_translation: Option<bool>,

    // ── VocabDrill settings ──
    /// Which drill types to include (e.g. "matching", "fill_in_the_blank", "word_scramble")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub drill_types: Option<Vec<String>>,
    /// How many drill rounds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_drill_count: Option<i32>,

    // ── Game settings ──
    /// Which game types to include
    #[serde(skip_serializing_if = "Option::is_none")]
    pub game_types: Option<Vec<GameType>>,
    /// "easy", "medium", "hard"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<String>,

    // ── Pronunciation settings ──
    /// How many sentences to practice
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sentence_count: Option<i32>,
    /// Passing threshold (0-100)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_accuracy_score: Option<f64>,
    /// "slow", "normal", "fast" TTS speed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speed: Option<String>,

    // ── Video settings ──
    /// Video URL for the phase (e.g. for games)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,

    // ── Conversation settings ──
    /// Number of AI conversation turns
    #[serde(skip_serializing_if = "Option::is_none")]
    pub turn_count: Option<i32>,
    /// Override scenario prompt
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scenario_context: Option<String>,

    // ── Global Library Linkages ──
    /// Manually selected vocabulary IDs
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specific_vocab_ids: Option<Vec<ObjectId>>,
    /// Manually selected game IDs
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specific_game_ids: Option<Vec<ObjectId>>,
    /// Manually selected video drill IDs
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specific_video_drill_ids: Option<Vec<ObjectId>>,

    // ── Topic-Based Vocab Selection ──
    /// Select entire VocabGroups by ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specific_vocab_group_ids: Option<Vec<ObjectId>>,
    /// Individual words to exclude from selected groups
    #[serde(skip_serializing_if = "Option::is_none")]
    pub excluded_vocab_ids: Option<Vec<ObjectId>>,
}

// ─── Level Template ────────────────────────────────────────────────

/// One per CEFR level (A1-C2). Provides sensible defaults for all
/// lessons at a given level.
/// Collection: "level_templates"
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LevelTemplate {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub level: ContentLevel,
    pub name: String,
    pub phases: Vec<PhaseConfig>,
    pub default_lives: i32,
    pub xp_multiplier: f64,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

// ─── Per-Lesson Session Override ───────────────────────────────────

/// Optional per-lesson override of the level template.
/// If absent, the lesson inherits everything from its level's template.
/// Collection: "lesson_session_configs"
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LessonSessionConfig {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub lesson_id: ObjectId,
    /// If set, overrides template phases entirely
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phases: Option<Vec<PhaseConfig>>,
    /// Override template lives
    #[serde(skip_serializing_if = "Option::is_none")]
    pub override_lives: Option<i32>,
    /// Override template XP multiplier
    #[serde(skip_serializing_if = "Option::is_none")]
    pub override_xp_multiplier: Option<f64>,
    /// Custom sentences for pronunciation phase
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pronunciation_sentences: Option<Vec<String>>,
    /// Custom AI conversation prompt
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conversation_prompt: Option<String>,
    /// Offline fallback branching tree
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branching_tree: Option<serde_json::Value>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

// ─── Admin Request/Response DTOs ───────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct UpdateLevelTemplateRequest {
    pub name: Option<String>,
    pub phases: Option<Vec<PhaseConfig>>,
    pub default_lives: Option<i32>,
    pub xp_multiplier: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertLessonConfigRequest {
    pub phases: Option<Vec<PhaseConfig>>,
    pub override_lives: Option<i32>,
    pub override_xp_multiplier: Option<f64>,
    pub pronunciation_sentences: Option<Vec<String>>,
    pub conversation_prompt: Option<String>,
    pub branching_tree: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateSessionConfigRequest {
    pub lesson_id: String,
}
