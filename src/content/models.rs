use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};

// ============ Category & Level Enums ============

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ContentLevel {
    Beginner,
    Intermediate,
    Advanced,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ContentCategory {
    Restaurant,
    Hotel,
    Cruise,
    Interview,
    General,
}

// ============ Course ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Course {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub title_id: Option<String>, // Bahasa Indonesia
    pub description: String,
    pub description_id: Option<String>,
    pub category: ContentCategory,
    pub level: ContentLevel,
    pub cover_image_url: Option<String>,
    pub is_published: bool,
    pub order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCourseRequest {
    pub title: String,
    pub title_id: Option<String>,
    pub description: String,
    pub description_id: Option<String>,
    pub category: ContentCategory,
    pub level: ContentLevel,
    pub cover_image_url: Option<String>,
    pub order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCourseRequest {
    pub title: Option<String>,
    pub title_id: Option<String>,
    pub description: Option<String>,
    pub description_id: Option<String>,
    pub category: Option<ContentCategory>,
    pub level: Option<ContentLevel>,
    pub cover_image_url: Option<String>,
    pub is_published: Option<bool>,
    pub order: Option<i32>,
}

// ============ Module ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Module {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub course_id: ObjectId,
    pub title: String,
    pub title_id: Option<String>,
    pub description: String,
    pub description_id: Option<String>,
    pub order: i32,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateModuleRequest {
    pub course_id: String,
    pub title: String,
    pub title_id: Option<String>,
    pub description: String,
    pub description_id: Option<String>,
    pub order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateModuleRequest {
    pub title: Option<String>,
    pub title_id: Option<String>,
    pub description: Option<String>,
    pub description_id: Option<String>,
    pub is_published: Option<bool>,
    pub order: Option<i32>,
}

// ============ Lesson ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Lesson {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub module_id: ObjectId,
    pub title: String,
    pub title_id: Option<String>,
    pub content: String,         // Rich text / markdown
    pub content_id: Option<String>,
    pub audio_url: Option<String>,
    pub level: ContentLevel,
    pub category: ContentCategory,
    pub xp_reward: i32,
    pub order: i32,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLessonRequest {
    pub module_id: String,
    pub title: String,
    pub title_id: Option<String>,
    pub content: String,
    pub content_id: Option<String>,
    pub audio_url: Option<String>,
    pub level: ContentLevel,
    pub category: ContentCategory,
    pub xp_reward: Option<i32>,
    pub order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLessonRequest {
    pub title: Option<String>,
    pub title_id: Option<String>,
    pub content: Option<String>,
    pub content_id: Option<String>,
    pub audio_url: Option<String>,
    pub level: Option<ContentLevel>,
    pub category: Option<ContentCategory>,
    pub xp_reward: Option<i32>,
    pub is_published: Option<bool>,
    pub order: Option<i32>,
}

// ============ Vocabulary ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vocabulary {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub lesson_id: ObjectId,
    pub word: String,
    pub translation: String,     // Bahasa Indonesia
    pub pronunciation: Option<String>, // phonetic
    pub audio_url: Option<String>,
    pub example_en: String,
    pub example_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVocabularyRequest {
    pub lesson_id: String,
    pub word: String,
    pub translation: String,
    pub pronunciation: Option<String>,
    pub audio_url: Option<String>,
    pub example_en: String,
    pub example_id: Option<String>,
}

// ============ Dialogue ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DialogueLine {
    pub speaker: String,
    pub text_en: String,
    pub text_id: Option<String>,
    pub audio_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Dialogue {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub lesson_id: ObjectId,
    pub title: String,
    pub context: Option<String>, // e.g. "At the hotel front desk"
    pub lines: Vec<DialogueLine>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDialogueRequest {
    pub lesson_id: String,
    pub title: String,
    pub context: Option<String>,
    pub lines: Vec<DialogueLine>,
}

// ============ Quiz ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuizQuestion {
    pub question: String,
    pub question_id: Option<String>,
    pub options: Vec<String>,
    pub correct_answer: usize, // index into options
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Quiz {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub lesson_id: ObjectId,
    pub title: String,
    pub passing_score: i32,  // percentage 0-100
    pub xp_reward: i32,
    pub questions: Vec<QuizQuestion>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuizRequest {
    pub lesson_id: String,
    pub title: String,
    pub passing_score: Option<i32>,
    pub xp_reward: Option<i32>,
    pub questions: Vec<QuizQuestion>,
}
