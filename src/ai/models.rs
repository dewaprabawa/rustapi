use serde::{Deserialize, Serialize};
use serde_json::Value;

// ============ Request: what the admin submits to generate a course ============

#[derive(Debug, Deserialize)]
pub struct GenerateCourseRequest {
    pub topic: String,                          // e.g. "Hotel Front Desk"
    pub level: String,                          // "a1" .. "c2"
    pub category: String,                       // "hotel", "restaurant", etc.
    pub skill_focus: Option<Vec<String>>,        // ["speaking", "listening"]
    pub target_age: Option<String>,              // "adults"
    pub num_modules: Option<i32>,                // default 2
    pub lessons_per_module: Option<i32>,          // default 2
    pub vocab_per_lesson: Option<i32>,            // default 4
}

// ============ Response: the full AI-generated course preview ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneratedCoursePreview {
    pub course: GeneratedCourse,
    pub modules: Vec<GeneratedModule>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GeneratedCourse {
    pub title: String,
    pub title_id: String,
    pub description: String,
    pub description_id: String,
    pub category: String,
    pub level: String,
    pub skill_focus: Vec<String>,
    pub target_age: String,
    pub estimated_duration: String,
    pub tags: Vec<String>,
}

impl Default for GeneratedCourse {
    fn default() -> Self {
        Self {
            title: String::new(),
            title_id: String::new(),
            description: String::new(),
            description_id: String::new(),
            category: "general".to_string(),
            level: "a1".to_string(),
            skill_focus: vec![],
            target_age: "adults".to_string(),
            estimated_duration: "4 weeks".to_string(),
            tags: vec![],
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GeneratedModule {
    pub title: String,
    pub title_id: String,
    pub description: String,
    pub description_id: String,
    pub order: i32,
    pub skill_tags: Vec<String>,
    pub lessons: Vec<GeneratedLesson>,
}

impl Default for GeneratedModule {
    fn default() -> Self {
        Self {
            title: String::new(),
            title_id: String::new(),
            description: String::new(),
            description_id: String::new(),
            order: 1,
            skill_tags: vec![],
            lessons: vec![],
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GeneratedLesson {
    pub title: String,
    pub title_id: String,
    pub content: String,
    pub content_id: String,
    pub instruction: String,
    pub instruction_id: String,
    pub culture_notes: String,
    pub xp_reward: i32,
    pub order: i32,
    pub vocabulary: Vec<GeneratedVocabulary>,
    pub dialogue: Option<GeneratedDialogue>,
    pub quiz: Option<GeneratedQuiz>,
    pub games: Vec<GeneratedGame>,
}

impl Default for GeneratedLesson {
    fn default() -> Self {
        Self {
            title: String::new(),
            title_id: String::new(),
            content: String::new(),
            content_id: String::new(),
            instruction: String::new(),
            instruction_id: String::new(),
            culture_notes: String::new(),
            xp_reward: 20,
            order: 1,
            vocabulary: vec![],
            dialogue: None,
            quiz: None,
            games: vec![],
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GeneratedVocabulary {
    pub word: String,
    pub translation: String,
    pub pronunciation: String,
    pub example_en: String,
    pub example_id: String,
}

impl Default for GeneratedVocabulary {
    fn default() -> Self {
        Self {
            word: String::new(),
            translation: String::new(),
            pronunciation: String::new(),
            example_en: String::new(),
            example_id: String::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GeneratedDialogue {
    pub title: String,
    pub context: String,
    pub lines: Vec<GeneratedDialogueLine>,
}

impl Default for GeneratedDialogue {
    fn default() -> Self {
        Self {
            title: String::new(),
            context: String::new(),
            lines: vec![],
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GeneratedDialogueLine {
    pub speaker: String,
    pub text_en: String,
    pub text_id: String,
}

impl Default for GeneratedDialogueLine {
    fn default() -> Self {
        Self {
            speaker: String::new(),
            text_en: String::new(),
            text_id: String::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GeneratedQuiz {
    pub title: String,
    pub passing_score: i32,
    pub xp_reward: i32,
    pub questions: Vec<GeneratedQuizQuestion>,
}

impl Default for GeneratedQuiz {
    fn default() -> Self {
        Self {
            title: "Lesson Quiz".to_string(),
            passing_score: 70,
            xp_reward: 30,
            questions: vec![],
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GeneratedQuizQuestion {
    pub question: String,
    pub question_id: String,
    pub options: Vec<String>,
    pub correct_answer: usize,
}

impl Default for GeneratedQuizQuestion {
    fn default() -> Self {
        Self {
            question: String::new(),
            question_id: String::new(),
            options: vec![],
            correct_answer: 0,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct GeneratedGame {
    pub game_type: String,
    pub title: String,
    pub instructions: String,
    pub difficulty: String,
    pub xp_reward: i64,
    pub data_json: Value,
}

impl Default for GeneratedGame {
    fn default() -> Self {
        Self {
            game_type: "SCENE_MATCHER".to_string(),
            title: String::new(),
            instructions: String::new(),
            difficulty: "easy".to_string(),
            xp_reward: 10,
            data_json: serde_json::json!({}),
        }
    }
}

// ============ Save Request: admin confirms and persists ============

#[derive(Debug, Deserialize)]
pub struct SaveCourseRequest {
    pub preview: GeneratedCoursePreview,
}

// ============ AI Generation Logs & Credit Tracking ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiGenerationLog {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<bson::oid::ObjectId>,
    pub admin_id: String,
    pub provider: String,
    pub action: String,              // "generate_course", "translate", "ai_generate"
    pub params: Value,               // request params snapshot
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub total_tokens: i64,
    pub estimated_cost_usd: f64,     // estimated cost in USD
    pub status: String,              // "success", "error"
    pub error_message: Option<String>,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Clone)]
pub struct CreditUsageSummary {
    pub today_count: i64,
    pub today_tokens: i64,
    pub today_cost_usd: f64,
    pub month_count: i64,
    pub month_tokens: i64,
    pub month_cost_usd: f64,
    pub daily_limit: i64,
    pub daily_remaining: i64,
    pub warning_level: String,       // "ok", "caution" (80%), "critical" (95%), "exceeded"
}
