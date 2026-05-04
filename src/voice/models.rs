use serde::{Deserialize, Serialize};
use bson::oid::ObjectId;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VoiceConfig {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub stt_provider: String, // e.g., "deepgram"
    pub tts_provider: String, // e.g., "elevenlabs"
    pub elevenlabs_voice_id: String,
    pub deepgram_api_key: String, // Note: storing in plain text here for simplicity of MVP, normally use secrets manager
    pub elevenlabs_api_key: String,
    pub language: String,
    #[serde(with = "mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVoiceConfigRequest {
    pub stt_provider: Option<String>,
    pub tts_provider: Option<String>,
    pub elevenlabs_voice_id: Option<String>,
    pub deepgram_api_key: Option<String>,
    pub elevenlabs_api_key: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TtsRequest {
    pub text: String,
    pub voice_id: Option<String>,
}
