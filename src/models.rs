use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use std::fmt;

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
    pub profile_image_url: Option<String>,

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
    pub persona: Option<Persona>, // Optional so user can sign up first, onboard later
}

#[derive(Debug, Deserialize)]
pub struct OnboardingRequest {
    pub level: String,
    pub tone: String,
    pub goal: String,
    pub weakness: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct FirebaseLoginRequest {
    pub id_token: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: User,
}

// ============ Admin Models ============

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Admin,
    SuperAdmin,
}

impl fmt::Display for Role {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Role::Admin => write!(f, "admin"),
            Role::SuperAdmin => write!(f, "superadmin"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Admin {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub email: String,
    #[serde(skip_serializing)]
    pub password: String, // hashed — never returned in responses
    pub name: String,
    pub role: Role,
    pub is_active: bool,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AdminLoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AdminAuthResponse {
    pub token: String,
    pub admin: Admin,
}

// ============ Pagination ============

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub data: Vec<T>,
    pub page: u64,
    pub limit: i64,
    pub total: u64,
}

// ============ Notifications ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Notification {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: Option<ObjectId>, // If None, it's a broadcast to all users
    pub title: String,
    pub message: String,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NotificationRequest {
    pub user_id: Option<String>,
    pub title: String,
    pub message: String,
}
