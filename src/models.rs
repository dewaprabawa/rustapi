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
    #[serde(skip_serializing_if = "String::is_empty")]
    pub password: String, // hashed
    pub name: Option<String>,
    pub profile_image_url: Option<String>,
    pub fcm_token: Option<String>,
    pub auth_provider: Option<String>, // e.g. "google.com", "facebook.com", "password"

    pub persona: Persona,
    pub progress: Progress,

    #[serde(default)]
    pub level: i32,
    #[serde(default)]
    pub xp: i32,

    pub is_verified: bool,
    #[serde(default, skip_serializing_if = "Option::is_none", with = "optional_bson_datetime")]
    pub last_login: Option<DateTime<Utc>>,

    #[serde(with = "resilient_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "resilient_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

/// Serde helper for Option<DateTime<Utc>> stored as BSON DateTime
pub mod optional_bson_datetime {
    use chrono::{DateTime, Utc};
    use serde::{self, Deserialize, Deserializer, Serialize, Serializer};
    use bson;

    pub fn serialize<S>(date: &Option<DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match date {
            Some(dt) => {
                let bson_dt = bson::DateTime::from_chrono(*dt);
                bson_dt.serialize(serializer)
            }
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Use Bson enum to handle any type stored in the field gracefully
        let opt = Option::<bson::Bson>::deserialize(deserializer)?;
        match opt {
            Some(bson::Bson::DateTime(dt)) => Ok(Some(dt.to_chrono())),
            // If the field is null, missing, or a non-DateTime type (e.g. corrupted data),
            // gracefully return None instead of failing deserialization.
            _ => Ok(None),
        }
    }
}

/// Serde helper for required DateTime<Utc> that gracefully handles corrupted BSON data.
/// Falls back to epoch if the field isn't a proper BSON DateTime.
mod resilient_bson_datetime {
    use chrono::{DateTime, Utc};
    use serde::{self, Deserialize, Deserializer, Serialize, Serializer};
    use bson;

    pub fn serialize<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let bson_dt = bson::DateTime::from_chrono(*date);
        bson_dt.serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let bson_val = bson::Bson::deserialize(deserializer)?;
        match bson_val {
            bson::Bson::DateTime(dt) => Ok(dt.to_chrono()),
            // If it was stored as a string (ISO format), try parsing
            bson::Bson::String(s) => {
                s.parse::<DateTime<Utc>>().unwrap_or_else(|_| Utc::now())
            .pipe(Ok)
            }
            // Fallback: return current time for corrupted data
            _ => Ok(Utc::now()),
        }
    }

    /// Helper trait for pipe-style chaining
    trait Pipe: Sized {
        fn pipe<F, R>(self, f: F) -> R where F: FnOnce(Self) -> R { f(self) }
    }
    impl<T> Pipe for T {}
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
pub struct UpdateProfileRequest {
    pub name: Option<String>,
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

#[derive(Debug, Deserialize)]
pub struct UpdateFcmTokenRequest {
    pub fcm_token: String,
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
    #[serde(skip_serializing_if = "String::is_empty")]
    pub password: String, // hashed — never returned in responses
    pub name: String,
    pub profile_image_url: Option<String>,
    pub role: Role,
    pub is_active: bool,

    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
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
    pub admin_id: Option<ObjectId>, // If set, it's for an admin
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
// ============ Admin Dashboard Stats ============

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_users: u64,
    pub total_courses: u64,
    pub total_scenarios: u64,
    pub total_speaking_sessions: u64,
    pub total_vocab_sets: u64,
    pub active_users_today: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub level: Option<i32>,
    pub xp: Option<i32>,
    pub profile_image_url: Option<String>,
    pub is_verified: Option<bool>,
}
