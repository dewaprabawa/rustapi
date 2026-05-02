use serde::{Deserialize, Serialize};

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

fn main() {
    let json = r#"{"title":"Introduction to Basic English","title_id":"Pengenalan Bahasa Inggris Dasar","category":"general","level":"a1","module_id":"69f4cbe69d78f75757a7e4ea","content":"## Introduction to English","content_id":"## Pengenalan Bahasa Inggris","xp_reward":10,"instruction":"","instruction_id":"","culture_notes":"","tags":[],"cover_image_url":""}"#;
    let res: Result<CreateLessonRequest, _> = serde_json::from_str(json);
    println!("{:?}", res);
}
