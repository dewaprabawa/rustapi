use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Persona {
    pub level: String,   // beginner | intermediate | advanced
    pub tone: String,    // friendly | casual | strict
    pub goal: String,
    pub weakness: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Progress {
    pub streak_days: i32,
    pub total_practice: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub email: String,
    pub password: String, // hashed
    pub name: Option<String>,

    pub persona: Persona,
    pub progress: Progress,

    pub is_verified: bool,
    pub last_login: Option<DateTime<Utc>>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
    pub persona: Persona,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: User,
}
