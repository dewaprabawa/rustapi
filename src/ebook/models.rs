use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};

// ============ Reference Books ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BookProfile {
    pub tone: String,
    pub lesson_structure: Vec<String>,
    pub exercise_types: Vec<String>,
    pub explanation_style: String,
    pub callout_boxes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Book {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub file_path: String,
    pub status: String, // "analyzed", "pending", "failed"
    pub profile: Option<BookProfile>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UploadBookRequest {
    pub title: String,
    pub status: Option<String>,
}

// ============ Generated Ebooks ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EbookConfig {
    pub stage: i32,
    pub course: i32,
    pub module: i32,
    pub lessons: Vec<i32>,
    pub level: String,
    pub reference_book_id: Option<ObjectId>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ebook {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub config: EbookConfig,
    pub lessons: Vec<serde_json::Value>, // Generated lesson content
    pub status: String, // "draft", "complete"
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateEbookRequest {
    pub stage: i32,
    pub course: i32,
    pub module: i32,
    pub lessons: Vec<i32>,
    pub level: String,
    pub reference_book_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEbookRequest {
    pub lessons: Option<Vec<serde_json::Value>>,
    pub status: Option<String>,
}

// ============ Curriculum Tree ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CurriculumLesson {
    pub number: i32,
    pub title: String,
    pub objectives: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CurriculumModule {
    pub number: i32,
    pub title: String,
    pub lessons: Vec<CurriculumLesson>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CurriculumCourse {
    pub number: i32,
    pub title: String,
    pub modules: Vec<CurriculumModule>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CurriculumStage {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub number: i32,
    pub title: String,
    pub courses: Vec<CurriculumCourse>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}
