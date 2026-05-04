use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};

// ============ Category & Level Enums ============

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ContentLevel {
    A1, A2, B1, B2, C1, C2,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ContentCategory {
    Restaurant, Hotel, Cruise, Interview, General, Business, Travel,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CourseStatus {
    Draft, Published, InReview, Archived,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SkillType {
    Speaking, Listening, Reading, Writing, Grammar, Vocabulary, Pronunciation,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TargetAge {
    Kids, Teens, Adults, All,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Visibility {
    Public, Private, Unlisted,
}

// ============ Course ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Course {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub title_id: Option<String>,
    pub description: String,
    pub description_id: Option<String>,
    pub category: ContentCategory,
    pub level: ContentLevel,
    pub status: CourseStatus,
    pub skill_focus: Vec<SkillType>,
    pub target_age: TargetAge,
    pub estimated_duration: String,
    pub is_paid: bool,
    pub enrollment_cap: Option<i32>,
    pub visibility: Visibility,
    pub cover_image_url: Option<String>,
    pub is_published: bool, // Legacy field, keeping for compatibility
    pub order: i32,
    pub tags: Option<Vec<String>>,
    pub source: Option<String>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
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
    pub skill_focus: Option<Vec<SkillType>>,
    pub target_age: Option<TargetAge>,
    pub estimated_duration: Option<String>,
    pub is_paid: Option<bool>,
    pub enrollment_cap: Option<i32>,
    pub visibility: Option<Visibility>,
    pub cover_image_url: Option<String>,
    pub order: Option<i32>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCourseRequest {
    pub title: Option<String>,
    pub title_id: Option<String>,
    pub description: Option<String>,
    pub description_id: Option<String>,
    pub category: Option<ContentCategory>,
    pub level: Option<ContentLevel>,
    pub status: Option<CourseStatus>,
    pub skill_focus: Option<Vec<SkillType>>,
    pub target_age: Option<TargetAge>,
    pub estimated_duration: Option<String>,
    pub is_paid: Option<bool>,
    pub enrollment_cap: Option<i32>,
    pub visibility: Option<Visibility>,
    pub cover_image_url: Option<String>,
    pub is_published: Option<bool>,
    pub order: Option<i32>,
    pub tags: Option<Vec<String>>,
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
    pub prerequisite_id: Option<ObjectId>, // Spec 2.2
    pub passing_score_threshold: Option<i32>, // Spec 2.2
    pub skill_tags: Vec<SkillType>, // Spec 2.3
    pub order: i32,
    pub is_published: bool,
    pub is_optional: bool, // Spec 2.2
    pub tags: Option<Vec<String>>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateModuleRequest {
    pub course_id: String,
    pub title: String,
    pub title_id: Option<String>,
    pub description: String,
    pub description_id: Option<String>,
    pub prerequisite_id: Option<String>,
    pub passing_score_threshold: Option<i32>,
    pub skill_tags: Option<Vec<SkillType>>,
    pub is_optional: Option<bool>,
    pub order: Option<i32>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateModuleRequest {
    pub title: Option<String>,
    pub title_id: Option<String>,
    pub description: Option<String>,
    pub description_id: Option<String>,
    pub prerequisite_id: Option<String>,
    pub passing_score_threshold: Option<i32>,
    pub skill_tags: Option<Vec<SkillType>>,
    pub is_optional: Option<bool>,
    pub is_published: Option<bool>,
    pub order: Option<i32>,
    pub tags: Option<Vec<String>>,
}

// ============ Lesson ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Lesson {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub module_id: ObjectId,
    pub title: String,
    pub title_id: Option<String>,
    pub content: String,
    pub content_id: Option<String>,
    pub instruction: Option<String>, // Spec 3.3
    pub instruction_id: Option<String>, // Bahasa Instruction Layer
    pub culture_notes: Option<String>, // Spec 3.3
    pub audio_url: Option<String>,
    pub level: ContentLevel,
    pub category: ContentCategory,
    pub xp_reward: i32,
    pub order: i32,
    pub is_published: bool,
    pub tags: Option<Vec<String>>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLessonRequest {
    pub module_id: String,
    pub title: String,
    pub title_id: Option<String>,
    pub content: String,
    pub content_id: Option<String>,
    pub instruction: Option<String>,
    pub instruction_id: Option<String>,
    pub culture_notes: Option<String>,
    pub audio_url: Option<String>,
    pub level: ContentLevel,
    pub category: ContentCategory,
    pub xp_reward: Option<i32>,
    pub order: Option<i32>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLessonRequest {
    pub title: Option<String>,
    pub title_id: Option<String>,
    pub content: Option<String>,
    pub content_id: Option<String>,
    pub instruction: Option<String>,
    pub instruction_id: Option<String>,
    pub culture_notes: Option<String>,
    pub audio_url: Option<String>,
    pub level: Option<ContentLevel>,
    pub category: Option<ContentCategory>,
    pub xp_reward: Option<i32>,
    pub is_published: Option<bool>,
    pub order: Option<i32>,
    pub tags: Option<Vec<String>>,
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
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
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

#[derive(Debug, Deserialize)]
pub struct UpdateVocabularyRequest {
    pub word: Option<String>,
    pub translation: Option<String>,
    pub pronunciation: Option<String>,
    pub audio_url: Option<String>,
    pub example_en: Option<String>,
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
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDialogueRequest {
    pub lesson_id: String,
    pub title: String,
    pub context: Option<String>,
    pub lines: Vec<DialogueLine>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDialogueRequest {
    pub title: Option<String>,
    pub context: Option<String>,
    pub lines: Option<Vec<DialogueLine>>,
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
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
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

#[derive(Debug, Deserialize)]
pub struct UpdateQuizRequest {
    pub title: Option<String>,
    pub passing_score: Option<i32>,
    pub xp_reward: Option<i32>,
    pub questions: Option<Vec<QuizQuestion>>,
}

// ============ LLM API Keys ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmApiKey {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub provider: String,       // "gemini" | "openai" | "anthropic"
    pub name: String,           // user-given label
    pub api_key: String,        // the actual key
    pub is_active: bool,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLlmApiKeyRequest {
    pub provider: String,
    pub name: String,
    pub api_key: String,
}

// ============ AI Translation & Generation ============

#[derive(Debug, Deserialize)]
pub struct TranslateRequest {
    pub text: String,
    pub from: Option<String>,   // default "en"
    pub to: Option<String>,     // default "id"
}

#[derive(Debug, Deserialize)]
pub struct AiGenerateRequest {
    pub entity_type: String,    // "course" | "module" | "lesson"
    pub context: Option<String>, // extra context like category, level
}

// ============ Content Version History ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContentVersion {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub entity_type: String,       // "course" | "module" | "lesson"
    pub entity_id: ObjectId,
    pub version: i32,
    pub snapshot: bson::Document,   // full document snapshot
    pub changed_by: String,        // admin email
    pub change_summary: Option<String>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}

// ============ AI Prompt Configuration ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIPromptConfig {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub entity_type: String,     // "course", "module", "lesson", "game"
    pub prompt_template: String, // The actual prompt, using {context} variable
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePromptRequest {
    pub prompt_template: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_lesson() {
        let json = "{\"title\":\"Introduction to Basic English\",\"title_id\":\"Pengenalan Bahasa Inggris Dasar\",\"category\":\"general\",\"level\":\"a1\",\"module_id\":\"69f4cbe69d78f75757a7e4ea\",\"content\":\"## Introduction to English\",\"content_id\":\"## Pengenalan Bahasa Inggris\",\"xp_reward\":10,\"instruction\":\"\",\"instruction_id\":\"\",\"culture_notes\":\"\",\"tags\":[],\"cover_image_url\":\"\"}";
        let res: Result<CreateLessonRequest, _> = serde_json::from_str(json);
        println!("DESERIALIZE RESULT: {:?}", res);
        assert!(res.is_ok());
    }
}
