// SpeakUp handlers implementation
use axum::{
    extract::{Path, State, Multipart},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use crate::handlers::{AppState, AppError};
use crate::models::{User, Admin};
use crate::speakup::models::{SpeakUpContent, SpeakUpSession};
use crate::speakup::engine::FluencyEngine;
use crate::voice::deepgram::DeepgramSTT;
use crate::voice::traits::SpeechToText;
use mongodb::Collection;
use std::sync::Arc;
use mongodb::bson::doc;
use futures::StreamExt;
use chrono::Utc;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct AiGenerateSpeakUpRequest {
    pub topic: String,
    pub content_type: String,
    pub difficulty: String,
}

/// POST /speakup/ai-generate
pub async fn speakup_ai_generate_content(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<AiGenerateSpeakUpRequest>,
) -> Result<axum::response::Response, AppError> {
    let db = state.db.database("rustapi");
    
    // Get Gemini Key
    let key_col: Collection<crate::content::models::LlmApiKey> = db.collection("llm_api_keys");
    let key_doc = key_col.find_one(doc! { "provider": "google", "is_active": true }).await?
        .ok_or(AppError::InternalServerError)?;
    
    let prompt = crate::ai::service::build_speakup_prompt(&payload.topic, &payload.content_type, &payload.difficulty);
    
    // Call Gemini (Simplified for now - using a helper from ai::handlers if available, or direct call)
    // For now, let's assume we have a generic call_gemini in ai::service
    let result_json = crate::ai::handlers::call_gemini_generic(&key_doc.api_key, &prompt).await?;
    
    Ok(Json(result_json).into_response())
}

/// POST /speakup/content
pub async fn speakup_create_content(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<SpeakUpContent>,
) -> Result<axum::response::Response, AppError> {
    let collection: Collection<SpeakUpContent> = state.db.database("rustapi").collection("speakup_content");
    let result = collection.insert_one(payload).await.map_err(|_| AppError::InternalServerError)?;
    let new_id = result.inserted_id.as_object_id().unwrap();
    
    let created = collection.find_one(doc! { "_id": new_id }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))?;
        
    Ok((StatusCode::CREATED, Json(created)).into_response())
}

/// PUT /speakup/content/:id
pub async fn speakup_update_content(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(mut payload): Json<SpeakUpContent>,
) -> Result<axum::response::Response, AppError> {
    let oid = mongodb::bson::oid::ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let collection: Collection<SpeakUpContent> = state.db.database("rustapi").collection("speakup_content");
    
    payload.id = Some(oid);
    let result = collection.replace_one(doc! { "_id": oid }, payload).await.map_err(|_| AppError::InternalServerError)?;
    
    if result.matched_count == 0 {
        return Err(AppError::NotFound("Not found".to_string()));
    }
    
    let updated = collection.find_one(doc! { "_id": oid }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))?;
        
    Ok(Json(updated).into_response())
}

/// DELETE /speakup/content/:id
pub async fn speakup_delete_content(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<axum::response::Response, AppError> {
    let oid = mongodb::bson::oid::ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let collection: Collection<SpeakUpContent> = state.db.database("rustapi").collection("speakup_content");
    
    let result = collection.delete_one(doc! { "_id": oid }).await.map_err(|_| AppError::InternalServerError)?;
    
    if result.deleted_count == 0 {
        return Err(AppError::NotFound("Not found".to_string()));
    }
    
    Ok(StatusCode::NO_CONTENT.into_response())
}

/// GET /speakup/content
pub async fn speakup_list_content(
    State(state): State<Arc<AppState>>,
) -> Result<axum::response::Response, AppError> {
    let collection: Collection<SpeakUpContent> = state.db.database("rustapi").collection("speakup_content");
    let mut cursor = collection.find(doc! {}).await.map_err(|_| AppError::InternalServerError)?;
    
    let mut results = Vec::new();
    while let Some(content) = cursor.next().await {
        if let Ok(c) = content {
            results.push(c);
        }
    }
    
    Ok(Json(results).into_response())
}

/// GET /speakup/content/:id
pub async fn speakup_get_content(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<axum::response::Response, AppError> {
    let oid = mongodb::bson::oid::ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let collection: Collection<SpeakUpContent> = state.db.database("rustapi").collection("speakup_content");
    
    let content = collection.find_one(doc! { "_id": oid }).await?
        .ok_or(AppError::NotFound("Content not found".to_string()))?;
    
    Ok(Json(content).into_response())
}

/// POST /speakup/analyze
pub async fn speakup_analyze_attempt(
    State(state): State<Arc<AppState>>,
    user: User,
    mut multipart: Multipart,
) -> Result<axum::response::Response, AppError> {
    let mut audio_data = None;
    let mut content_id = None;
    let mut mime_type = "audio/wav".to_string();

    while let Some(field) = multipart.next_field().await.map_err(|_| AppError::InternalServerError)? {
        match field.name() {
            Some("audio") => {
                mime_type = field.content_type().unwrap_or("audio/wav").to_string();
                audio_data = Some(field.bytes().await.map_err(|_| AppError::InternalServerError)?.to_vec());
            }
            Some("content_id") => {
                content_id = Some(field.text().await.map_err(|_| AppError::InternalServerError)?);
            }
            _ => {}
        }
    }

    let audio_bytes = audio_data.ok_or(AppError::BadRequest("Missing audio".to_string()))?;
    let cid_str = content_id.ok_or(AppError::BadRequest("Missing content_id".to_string()))?;
    let cid = mongodb::bson::oid::ObjectId::parse_str(&cid_str).map_err(|_| AppError::BadRequest("Invalid content_id".to_string()))?;

    // 1. Get Content from DB
    let db = state.db.database("rustapi");
    let content_col: Collection<SpeakUpContent> = db.collection("speakup_content");
    let content = content_col.find_one(doc! { "_id": cid }).await?
        .ok_or(AppError::NotFound("Content not found".to_string()))?;

    // 2. Get Deepgram Key
    let config_col: Collection<crate::voice::models::VoiceConfig> = db.collection("voice_configs");
    let config = config_col.find_one(doc! {}).await?.ok_or(AppError::InternalServerError)?;
    let dg_key = if config.deepgram_api_key.is_empty() {
        std::env::var("DEEPGRAM_API_KEY").map_err(|_| AppError::InternalServerError)?
    } else {
        config.deepgram_api_key
    };

    // 3. Transcribe with Timing
    let stt = DeepgramSTT::new(dg_key);
    let transcript_res = stt.transcribe_with_timing(audio_bytes, &mime_type).await?;

    // 4. Analyze via FluencyEngine
    let analysis = FluencyEngine::analyze(
        transcript_res,
        &content.transcript,
        content.target_wpm,
    ).await?;

    // 5. Save Session
    let session_col: Collection<SpeakUpSession> = db.collection("speakup_sessions");
    let session = SpeakUpSession {
        id: None,
        user_id: user.id.unwrap(),
        content_id: cid,
        analysis: analysis.clone(),
        audio_recording_url: None, // TODO: Upload to S3 if needed
        created_at: Utc::now(),
    };
    session_col.insert_one(session).await?;
    
    // Notify admins about the new activity
    let db_clone = state.db.clone();
    let user_name = user.name.clone().unwrap_or_else(|| "User".to_string());
    let score = analysis.fluency_score;
    tokio::spawn(async move {
        crate::notification::notify_admins(
            &db_clone,
            "New SpeakUp Activity 🎙️",
            &format!("User {} completed a SpeakUp session with a fluency score of {}%.", user_name, score),
        ).await;
    });

    Ok(Json(analysis).into_response())
}
