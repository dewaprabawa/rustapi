// SpeakUp handlers implementation
use axum::{
    extract::{Path, State, Multipart},
    response::IntoResponse,
    http::StatusCode,
    Json,
};
use crate::handlers::{AppState, AppError};
use crate::models::{User, Admin};
use crate::speakup::models::{SpeakUpContent, SpeakUpSession, CreateSpeakUpContentRequest, UpdateSpeakUpContentRequest};
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
    
    // Get all active LLM API keys (multi-provider fallback)
    let key_col: Collection<crate::content::models::LlmApiKey> = db.collection("llm_api_keys");
    let cursor = key_col.find(doc! { "is_active": true }).await?;
    let active_keys: Vec<crate::content::models::LlmApiKey> = {
        use futures::TryStreamExt;
        cursor.try_collect().await?
    };

    if active_keys.is_empty() {
        crate::notification::notify_admins(&state.db, "AI API Keys Empty", "No active LLM API keys found. Please add or activate keys in API Key Management.").await;
        return Err(AppError::BadRequest("No active LLM API key found. Please activate an API key in API Key Management.".to_string()));
    }
    
    let prompt_col: Collection<crate::content::models::AIPromptConfig> = db.collection("ai_prompts");
    let entity_type = payload.content_type.clone();
    let custom_prompt = prompt_col.find_one(doc! { "entity_type": &entity_type }).await.ok().flatten();
    let prompt = if let Some(p) = custom_prompt {
        p.prompt_template
            .replace("{context}", &payload.topic)
            .replace("{difficulty}", &payload.difficulty)
    } else {
        crate::ai::service::build_speakup_prompt(&payload.topic, &payload.content_type, &payload.difficulty)
    };
    
    // Try each active key until one succeeds
    let mut last_error = None;
    for key in &active_keys {
        match crate::ai::service::call_llm_for_course(key, &prompt).await {
            Ok(resp) => {
                // Parse the LLM response text into JSON
                let cleaned = resp.text.trim();
                let cleaned = if cleaned.starts_with("```") {
                    let start = cleaned.find('\n').map(|i| i + 1).unwrap_or(0);
                    let end = cleaned.rfind("```").unwrap_or(cleaned.len());
                    &cleaned[start..end]
                } else {
                    cleaned
                };
                
                let result_json: serde_json::Value = serde_json::from_str(cleaned.trim())
                    .map_err(|e| {
                        eprintln!("SpeakUp AI: Failed to parse LLM JSON: {:?}", e);
                        eprintln!("Raw response (first 500 chars): {}", &cleaned[..cleaned.len().min(500)]);
                        AppError::BadRequest(format!("AI returned invalid JSON: {}", e))
                    })?;
                
                return Ok(Json(result_json).into_response());
            }
            Err(e) => {
                eprintln!("⚠️ SpeakUp AI: Provider ({}) failed: {:?}", key.provider, e);
                last_error = Some(e);
            }
        }
    }
    crate::notification::notify_admins(&state.db, "AI API Keys Exhausted", "All active AI API keys have reached their limit or failed. Please check credits and error logs.").await;
    Err(last_error.unwrap_or(AppError::InternalServerError))
}

/// POST /speakup/content
pub async fn speakup_create_content(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateSpeakUpContentRequest>,
) -> Result<axum::response::Response, AppError> {
    let collection: Collection<SpeakUpContent> = state.db.database("rustapi").collection("speakup_content");
    
    let now = Utc::now();
    let content = SpeakUpContent {
        id: None,
        content_type: payload.content_type,
        difficulty: payload.difficulty,
        title: payload.title,
        title_id: payload.title_id,
        transcript: payload.transcript,
        transcript_id: payload.transcript_id,
        audio_url: payload.audio_url,
        steps: payload.steps,
        target_wpm: payload.target_wpm.unwrap_or(120),
        created_at: now,
        updated_at: now,
    };

    let result = collection.insert_one(content.clone()).await.map_err(|_| AppError::InternalServerError)?;
    
    let mut created = content;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)).into_response())
}

/// PUT /speakup/content/:id
pub async fn speakup_update_content(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateSpeakUpContentRequest>,
) -> Result<axum::response::Response, AppError> {
    let oid = mongodb::bson::oid::ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let collection: Collection<SpeakUpContent> = state.db.database("rustapi").collection("speakup_content");

    let mut update = doc! { "updated_at": Utc::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.title_id { update.insert("title_id", v); }
    if let Some(v) = payload.transcript { update.insert("transcript", v); }
    if let Some(v) = payload.transcript_id { update.insert("transcript_id", v); }
    if let Some(v) = payload.audio_url { update.insert("audio_url", v); }
    if let Some(v) = payload.steps { update.insert("steps", mongodb::bson::to_bson(&v).unwrap()); }
    if let Some(v) = payload.difficulty { update.insert("difficulty", v); }
    if let Some(v) = payload.target_wpm { update.insert("target_wpm", v); }
    if let Some(v) = payload.content_type { update.insert("content_type", mongodb::bson::to_bson(&v).unwrap()); }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await.map_err(|_| AppError::InternalServerError)?;
    if result.matched_count == 0 { return Err(AppError::NotFound("Content not found".to_string())); }
    
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

/// Helper to perform analysis logic shared between User and Admin handlers
async fn perform_speakup_analysis_logic(
    state: Arc<AppState>,
    cid: mongodb::bson::oid::ObjectId,
    audio_bytes: Vec<u8>,
    mime_type: String,
) -> Result<crate::speakup::models::SpeakUpAnalysis, AppError> {
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

    Ok(analysis)
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

    println!("🎙️ Starting SpeakUp analysis for content: {}", cid_str);
    println!("📦 Audio size: {} bytes, MIME: {}", audio_bytes.len(), mime_type);

    let analysis = perform_speakup_analysis_logic(state.clone(), cid, audio_bytes, mime_type).await.map_err(|e| {
        println!("❌ Analysis logic failed: {:?}", e);
        e
    })?;

    println!("✅ Analysis complete. Score: {}", analysis.fluency_score);

    // Save Session
    let db = state.db.database("rustapi");
    let session_col: Collection<SpeakUpSession> = db.collection("speakup_sessions");
    let session = SpeakUpSession {
        id: None,
        user_id: user.id.unwrap(),
        content_id: cid,
        analysis: analysis.clone(),
        audio_recording_url: None,
        created_at: Utc::now(),
    };
    session_col.insert_one(session).await?;
    
    // Notify admins
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

/// POST /admin/speakup/test-analyze
/// Admin version of analyze that doesn't require a student user account
pub async fn speakup_admin_test_analyze(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
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

    println!("🧪 [Admin Test] Starting SpeakUp analysis for content: {}", cid_str);
    println!("📦 Audio size: {} bytes, MIME: {}", audio_bytes.len(), mime_type);

    let analysis = perform_speakup_analysis_logic(state, cid, audio_bytes, mime_type).await.map_err(|e| {
        println!("❌ Admin Test analysis failed: {:?}", e);
        e
    })?;

    println!("✅ Admin Test analysis complete. Score: {}", analysis.fluency_score);

    // For admin tests, we don't necessarily need to save to speakup_sessions
    // but returning the analysis is enough for the UI to show "real" behavior.

    Ok(Json(analysis).into_response())
}
