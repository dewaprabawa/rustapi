use axum::{
    extract::{State, Json, Multipart},
    http::header,
    response::IntoResponse,
};
use mongodb::Collection;
use bson::doc;
use std::sync::Arc;
use chrono::Utc;

use crate::handlers::{AppState, AppError};
use crate::models::Admin;
use crate::voice::models::{VoiceConfig, UpdateVoiceConfigRequest, TtsRequest};
use crate::voice::traits::{SpeechToText, TextToSpeech};
use crate::voice::elevenlabs::ElevenLabsTTS;
use crate::voice::deepgram::DeepgramSTT;

// ==================== ADMIN: Configuration Endpoints ====================

/// GET /admin/voice/config
pub async fn get_voice_config(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<VoiceConfig> = state.db.database("rustapi").collection("voice_configs");
    let config = col.find_one(doc! {}).await?;

    match config {
        Some(c) => Ok(Json(c)),
        None => {
            // Return default
            let default_config = VoiceConfig {
                id: None,
                stt_provider: "deepgram".to_string(),
                tts_provider: "elevenlabs".to_string(),
                elevenlabs_voice_id: "ErXwobaYiN019PkySvjV".to_string(), // Antoni
                deepgram_api_key: "".to_string(),
                elevenlabs_api_key: "".to_string(),
                language: "en-US".to_string(),
                updated_at: Utc::now(),
            };
            let _ = col.insert_one(default_config.clone()).await;
            Ok(Json(default_config))
        }
    }
}

/// PUT /admin/voice/config
pub async fn update_voice_config(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<UpdateVoiceConfigRequest>,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<VoiceConfig> = state.db.database("rustapi").collection("voice_configs");
    
    let mut update_doc = doc! { "updated_at": bson::DateTime::now() };
    
    if let Some(v) = payload.stt_provider { update_doc.insert("stt_provider", v); }
    if let Some(v) = payload.tts_provider { update_doc.insert("tts_provider", v); }
    if let Some(v) = payload.elevenlabs_voice_id { update_doc.insert("elevenlabs_voice_id", v); }
    if let Some(v) = payload.deepgram_api_key { update_doc.insert("deepgram_api_key", v); }
    if let Some(v) = payload.elevenlabs_api_key { update_doc.insert("elevenlabs_api_key", v); }
    if let Some(v) = payload.language { update_doc.insert("language", v); }

    let result = col.update_one(doc! {}, doc! { "$set": update_doc }).await?;
    if result.matched_count == 0 {
        return Err(AppError::NotFound("Not found".to_string()));
    }

    let updated = col.find_one(doc! {}).await?.unwrap();
    Ok(Json(updated))
}

// ==================== APP & ADMIN: Proxy Endpoints ====================

/// POST /voice/tts (JSON)
/// Uses active config to synthesize text and returns MP3 audio.
pub async fn text_to_speech(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TtsRequest>,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<VoiceConfig> = state.db.database("rustapi").collection("voice_configs");
    let config = col.find_one(doc! {}).await?.ok_or(AppError::InternalServerError)?;

    let tts = ElevenLabsTTS::new(config.elevenlabs_api_key);
    let voice_id = payload.voice_id.unwrap_or(config.elevenlabs_voice_id);
    
    let audio_bytes = tts.synthesize(&payload.text, &voice_id).await?;

    Ok((
        [(header::CONTENT_TYPE, "audio/mpeg")],
        audio_bytes,
    ))
}

/// POST /voice/stt (Multipart)
/// Accepts audio file and returns text transcript.
pub async fn speech_to_text(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut audio_data = Vec::new();
    let mut mime_type = String::from("audio/mpeg");

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        if field.name() == Some("file") {
            if let Some(content_type) = field.content_type() {
                mime_type = content_type.to_string();
            }
            audio_data = field.bytes().await.unwrap_or_default().to_vec();
            break;
        }
    }

    if audio_data.is_empty() {
        return Err(AppError::BadRequest("No audio file provided".to_string()));
    }

    let col: Collection<VoiceConfig> = state.db.database("rustapi").collection("voice_configs");
    let config = col.find_one(doc! {}).await?.ok_or(AppError::InternalServerError)?;

    let stt = DeepgramSTT::new(config.deepgram_api_key);
    let transcript = stt.transcribe(audio_data, &mime_type).await?;

    Ok(Json(serde_json::json!({ "transcript": transcript })))
}
