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
pub struct SpeakUpTestListenRequest {
    pub content_id: String,
    pub step_index: Option<usize>,
}

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
    step_index: Option<usize>,
    audio_bytes: Vec<u8>,
    mime_type: String,
) -> Result<crate::speakup::models::SpeakUpAnalysis, AppError> {
    // 1. Get Content from DB
    let db = state.db.database("rustapi");
    let content_col: Collection<SpeakUpContent> = db.collection("speakup_content");
    let content = content_col.find_one(doc! { "_id": cid }).await?
        .ok_or(AppError::NotFound("Content not found".to_string()))?;

    let target_text = match content.content_type {
        crate::speakup::models::SpeakUpType::Expansion => {
            if let Some(steps) = &content.steps {
                if let Some(idx) = step_index {
                    steps.get(idx).cloned().unwrap_or_default()
                } else {
                    steps.join(" ")
                }
            } else {
                content.transcript.clone()
            }
        }
        _ => content.transcript.clone(),
    };

    if target_text.trim().is_empty() {
        return Err(AppError::BadRequest("Target text is empty for analysis".to_string()));
    }

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
        &target_text,
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
    let mut step_index = None;
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
            Some("step_index") => {
                if let Ok(idx_str) = field.text().await {
                    if let Ok(idx) = idx_str.parse::<usize>() {
                        step_index = Some(idx);
                    }
                }
            }
            _ => {}
        }
    }

    let audio_bytes = audio_data.ok_or(AppError::BadRequest("Missing audio".to_string()))?;
    let cid_str = content_id.ok_or(AppError::BadRequest("Missing content_id".to_string()))?;
    let cid = mongodb::bson::oid::ObjectId::parse_str(&cid_str).map_err(|_| AppError::BadRequest("Invalid content_id".to_string()))?;

    println!("🎙️ Starting SpeakUp analysis for content: {}", cid_str);
    println!("📦 Audio size: {} bytes, MIME: {}", audio_bytes.len(), mime_type);

    let analysis = perform_speakup_analysis_logic(state.clone(), cid, step_index, audio_bytes, mime_type).await.map_err(|e| {
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
    let mut step_index = None;
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
            Some("step_index") => {
                if let Ok(idx_str) = field.text().await {
                    if let Ok(idx) = idx_str.parse::<usize>() {
                        step_index = Some(idx);
                    }
                }
            }
            _ => {}
        }
    }

    let audio_bytes = audio_data.ok_or(AppError::BadRequest("Missing audio".to_string()))?;
    let cid_str = content_id.ok_or(AppError::BadRequest("Missing content_id".to_string()))?;
    let cid = mongodb::bson::oid::ObjectId::parse_str(&cid_str).map_err(|_| AppError::BadRequest("Invalid content_id".to_string()))?;

    println!("🧪 [Admin Test] Starting SpeakUp analysis for content: {}", cid_str);
    println!("📦 Audio size: {} bytes, MIME: {}", audio_bytes.len(), mime_type);

    let analysis = perform_speakup_analysis_logic(state, cid, step_index, audio_bytes, mime_type).await.map_err(|e| {
        println!("❌ Admin Test analysis failed: {:?}", e);
        e
    })?;

    println!("✅ Admin Test analysis complete. Score: {}", analysis.fluency_score);

    // For admin tests, we don't necessarily need to save to speakup_sessions
    // but returning the analysis is enough for the UI to show "real" behavior.

    Ok(Json(analysis).into_response())
}

// ══════════════════════════════════════════════════════════════════════
// MOBILE ENDPOINTS  (User-authenticated — no Admin extractor)
// ══════════════════════════════════════════════════════════════════════

/// GET /speakup/mobile/content
/// List all SpeakUp drills available to the mobile student.
/// Optional query params:  ?type=shadowing|expansion  &difficulty=A1|B1
pub async fn mobile_list_speakup(
    State(state): State<Arc<AppState>>,
    _user: User,
    axum::extract::Query(params): axum::extract::Query<MobileListQuery>,
) -> Result<axum::response::Response, AppError> {
    let collection: Collection<SpeakUpContent> =
        state.db.database("rustapi").collection("speakup_content");

    let mut filter = doc! {};
    if let Some(t) = &params.content_type {
        filter.insert("content_type", t.as_str());
    }
    if let Some(d) = &params.difficulty {
        filter.insert("difficulty", d.as_str());
    }

    let mut cursor = collection
        .find(filter)
        .await
        .map_err(|_| AppError::InternalServerError)?;

    let mut results = Vec::new();
    while let Some(item) = cursor.next().await {
        if let Ok(c) = item {
            results.push(c);
        }
    }

    Ok(Json(results).into_response())
}

#[derive(Debug, Deserialize)]
pub struct MobileListQuery {
    #[serde(rename = "type")]
    pub content_type: Option<String>,
    pub difficulty: Option<String>,
}

/// POST /speakup/mobile/listen
/// Returns base64 MP3 of the reference transcript (or a specific expansion step).
/// Body (JSON):
///   { "content_id": "...", "step_index": 0 }  // step_index optional
///
/// The mobile app plays this audio for the student to shadow/repeat.
#[derive(Debug, Deserialize)]
pub struct MobileListenRequest {
    pub content_id: String,
    pub step_index: Option<usize>,
}

pub async fn mobile_speakup_listen(
    State(state): State<Arc<AppState>>,
    _user: User,
    Json(payload): Json<MobileListenRequest>,
) -> Result<axum::response::Response, AppError> {
    let cid = mongodb::bson::oid::ObjectId::parse_str(&payload.content_id)
        .map_err(|_| AppError::BadRequest("Invalid content_id".to_string()))?;

    let db = state.db.database("rustapi");
    let content_col: Collection<SpeakUpContent> = db.collection("speakup_content");
    let content = content_col
        .find_one(doc! { "_id": cid })
        .await?
        .ok_or(AppError::NotFound("Content not found".to_string()))?;

    // Determine which text to synthesize
    let target_text = resolve_target_text(&content, payload.step_index);

    if target_text.trim().is_empty() {
        return Err(AppError::BadRequest(
            "No text available for this content/step.".to_string(),
        ));
    }

    // Load voice config
    let config_col: Collection<crate::voice::models::VoiceConfig> =
        db.collection("voice_configs");
    let config = config_col
        .find_one(doc! {})
        .await?
        .ok_or(AppError::InternalServerError)?;

    // Synthesize via ElevenLabs
    use crate::voice::traits::TextToSpeech;
    let tts = crate::voice::elevenlabs::ElevenLabsTTS::new(config.elevenlabs_api_key.clone());
    let audio_bytes = tts
        .synthesize(&target_text, &config.elevenlabs_voice_id)
        .await?;

    // Return base64 JSON (mobile-friendly — avoids binary streaming issues)
    use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
    Ok(Json(serde_json::json!({
        "audio_base64": BASE64.encode(&audio_bytes),
        "audio_mime": "audio/mpeg",
        "text": target_text,
        "content_type": format!("{:?}", content.content_type).to_lowercase(),
        "target_wpm": content.target_wpm
    }))
    .into_response())
}

/// POST /speakup/mobile/attempt  (multipart)
/// The student submits a voice recording.  The server:
///   1. Transcribes via Deepgram
///   2. Scores fluency via FluencyEngine
///   3. Generates AI coaching feedback via Groq
///   4. Saves session
///   5. Returns full SpeakUpAnalysis + ai_feedback + corrective audio (base64)
///
/// Multipart fields:
///   audio       : audio file bytes
///   content_id  : ObjectId string
///   step_index  : (optional) integer — for expansion drills
pub async fn mobile_speakup_attempt(
    State(state): State<Arc<AppState>>,
    user: User,
    mut multipart: Multipart,
) -> Result<axum::response::Response, AppError> {
    // Parse multipart
    let mut audio_data: Option<Vec<u8>> = None;
    let mut content_id: Option<String> = None;
    let mut step_index: Option<usize> = None;
    let mut mime_type = "audio/wav".to_string();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::InternalServerError)?
    {
        match field.name() {
            Some("audio") => {
                mime_type = field
                    .content_type()
                    .unwrap_or("audio/wav")
                    .to_string();
                audio_data = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|_| AppError::InternalServerError)?
                        .to_vec(),
                );
            }
            Some("content_id") => {
                content_id =
                    Some(field.text().await.map_err(|_| AppError::InternalServerError)?);
            }
            Some("step_index") => {
                if let Ok(s) = field.text().await {
                    step_index = s.parse::<usize>().ok();
                }
            }
            _ => {}
        }
    }

    let audio_bytes =
        audio_data.ok_or(AppError::BadRequest("Missing audio field".to_string()))?;
    let cid_str =
        content_id.ok_or(AppError::BadRequest("Missing content_id field".to_string()))?;
    let cid = mongodb::bson::oid::ObjectId::parse_str(&cid_str)
        .map_err(|_| AppError::BadRequest("Invalid content_id".to_string()))?;

    // 1. Fluency analysis (STT via Deepgram + engine scoring)
    let analysis =
        perform_speakup_analysis_logic(state.clone(), cid, step_index, audio_bytes, mime_type)
            .await?;

    // 2. AI coaching feedback via Groq (key loaded from llm_api_keys DB)
    let db = state.db.database("rustapi");
    let ai_feedback = generate_groq_feedback(&analysis, step_index, &db).await;

    // 3. Synthesize corrective audio of the feedback via ElevenLabs
    let corrective_audio_b64 = {
        let db = state.db.database("rustapi");
        let config_col: Collection<crate::voice::models::VoiceConfig> =
            db.collection("voice_configs");
        match config_col.find_one(doc! {}).await {
            Ok(Some(config)) if !config.elevenlabs_api_key.is_empty() => {
                use crate::voice::traits::TextToSpeech;
                let tts =
                    crate::voice::elevenlabs::ElevenLabsTTS::new(config.elevenlabs_api_key);
                match tts.synthesize(&ai_feedback, &config.elevenlabs_voice_id).await {
                    Ok(audio) => {
                        use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
                        Some(BASE64.encode(&audio))
                    }
                    Err(e) => {
                        eprintln!("TTS for feedback failed: {:?}", e);
                        None
                    }
                }
            }
            _ => None,
        }
    };

    // 4. Save session
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

    // 5. Return enriched response
    Ok(Json(serde_json::json!({
        "analysis": analysis,
        "ai_feedback": ai_feedback,
        "feedback_audio_base64": corrective_audio_b64,
        "feedback_audio_mime": "audio/mpeg"
    }))
    .into_response())
}

/// POST /speakup/mobile/expansion/step  (multipart)
/// Expansion drill: student submits audio for ONE step at a time.
/// Returns per-step analysis + whether to advance to next step.
///
/// Multipart fields:
///   audio       : audio file bytes
///   content_id  : ObjectId string
///   step_index  : integer (which step, 0-based)
pub async fn mobile_expansion_step(
    State(state): State<Arc<AppState>>,
    user: User,
    mut multipart: Multipart,
) -> Result<axum::response::Response, AppError> {
    let mut audio_data: Option<Vec<u8>> = None;
    let mut content_id: Option<String> = None;
    let mut step_index: Option<usize> = None;
    let mut mime_type = "audio/wav".to_string();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::InternalServerError)?
    {
        match field.name() {
            Some("audio") => {
                mime_type = field.content_type().unwrap_or("audio/wav").to_string();
                audio_data = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|_| AppError::InternalServerError)?
                        .to_vec(),
                );
            }
            Some("content_id") => {
                content_id =
                    Some(field.text().await.map_err(|_| AppError::InternalServerError)?);
            }
            Some("step_index") => {
                if let Ok(s) = field.text().await {
                    step_index = s.parse::<usize>().ok();
                }
            }
            _ => {}
        }
    }

    let audio_bytes =
        audio_data.ok_or(AppError::BadRequest("Missing audio field".to_string()))?;
    let cid_str =
        content_id.ok_or(AppError::BadRequest("Missing content_id field".to_string()))?;
    let step_idx =
        step_index.ok_or(AppError::BadRequest("Missing step_index field".to_string()))?;
    let cid = mongodb::bson::oid::ObjectId::parse_str(&cid_str)
        .map_err(|_| AppError::BadRequest("Invalid content_id".to_string()))?;

    // Load content to know total steps
    let content_col: Collection<SpeakUpContent> =
        state.db.database("rustapi").collection("speakup_content");
    let content = content_col
        .find_one(doc! { "_id": cid })
        .await?
        .ok_or(AppError::NotFound("Content not found".to_string()))?;

    let total_steps = content.steps.as_ref().map(|s| s.len()).unwrap_or(1);

    // Analyse only this step
    let analysis = perform_speakup_analysis_logic(
        state.clone(),
        cid,
        Some(step_idx),
        audio_bytes,
        mime_type,
    )
    .await?;

    // Decide whether student passed this step (score threshold: 60)
    let passed = analysis.pronunciation_score >= 60.0;
    let is_last_step = step_idx + 1 >= total_steps;
    let next_step = if passed && !is_last_step {
        Some(step_idx + 1)
    } else {
        None
    };

    let db = state.db.database("rustapi");
    let ai_feedback = generate_groq_feedback(&analysis, Some(step_idx), &db).await;

    // Pre-fetch the NEXT step's audio if we're advancing
    let next_step_audio_b64 = if let Some(ns) = next_step {
        let db = state.db.database("rustapi");
        let config_col: Collection<crate::voice::models::VoiceConfig> =
            db.collection("voice_configs");
        if let Ok(Some(config)) = config_col.find_one(doc! {}).await {
            let next_text = resolve_target_text(&content, Some(ns));
            if !next_text.is_empty() {
                use crate::voice::traits::TextToSpeech;
                let tts =
                    crate::voice::elevenlabs::ElevenLabsTTS::new(config.elevenlabs_api_key);
                match tts.synthesize(&next_text, &config.elevenlabs_voice_id).await {
                    Ok(audio) => {
                        use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
                        Some(serde_json::json!({
                            "step_index": ns,
                            "text": next_text,
                            "audio_base64": BASE64.encode(&audio),
                            "audio_mime": "audio/mpeg"
                        }))
                    }
                    Err(_) => None,
                }
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };

    // Save session for this step
    let session_col: Collection<SpeakUpSession> =
        state.db.database("rustapi").collection("speakup_sessions");
    let session = SpeakUpSession {
        id: None,
        user_id: user.id.unwrap(),
        content_id: cid,
        analysis: analysis.clone(),
        audio_recording_url: None,
        created_at: Utc::now(),
    };
    session_col.insert_one(session).await?;

    Ok(Json(serde_json::json!({
        "step_index": step_idx,
        "total_steps": total_steps,
        "passed": passed,
        "is_complete": is_last_step && passed,
        "analysis": analysis,
        "ai_feedback": ai_feedback,
        "next_step": next_step,
        "next_step_audio": next_step_audio_b64
    }))
    .into_response())
}

/// GET /speakup/mobile/history
/// Return the student's past SpeakUp sessions (last 20).
pub async fn mobile_speakup_history(
    State(state): State<Arc<AppState>>,
    user: User,
) -> Result<axum::response::Response, AppError> {
    let db = state.db.database("rustapi");
    let session_col: Collection<SpeakUpSession> = db.collection("speakup_sessions");

    let user_oid = user.id.unwrap();
    let opts = mongodb::options::FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .limit(20)
        .build();

    let mut cursor = session_col
        .find(doc! { "user_id": user_oid })
        .with_options(opts)
        .await
        .map_err(|_| AppError::InternalServerError)?;

    let mut sessions = Vec::new();
    while let Some(item) = cursor.next().await {
        if let Ok(s) = item {
            sessions.push(s);
        }
    }

    Ok(Json(sessions).into_response())
}

// ──────────────────────────────────────────────────────────────
// Private helpers
// ──────────────────────────────────────────────────────────────

/// Resolve the text a student should practice.
/// For expansion: return the step text at `step_index` if given, else full transcript.
/// For shadowing: always the full transcript.
fn resolve_target_text(content: &SpeakUpContent, step_index: Option<usize>) -> String {
    match content.content_type {
        crate::speakup::models::SpeakUpType::Expansion => {
            if let Some(steps) = &content.steps {
                if let Some(idx) = step_index {
                    return steps.get(idx).cloned().unwrap_or_default();
                }
                return steps.join(" ");
            }
            content.transcript.clone()
        }
        _ => content.transcript.clone(),
    }
}

/// Generate AI coaching feedback using Groq based on analysis scores.
/// Falls back to a template string if Groq key is not configured.
async fn generate_groq_feedback(
    analysis: &crate::speakup::models::SpeakUpAnalysis,
    step_index: Option<usize>,
    db: &mongodb::Database,
) -> String {
    // Fetch the active Groq key from llm_api_keys collection
    let key_col: mongodb::Collection<crate::content::models::LlmApiKey> =
        db.collection("llm_api_keys");
    let groq_key = match key_col
        .find_one(doc! { "provider": "groq", "is_active": true })
        .await
    {
        Ok(Some(k)) if !k.api_key.is_empty() => k.api_key,
        _ => return template_feedback(analysis, step_index),
    };

    let step_context = step_index
        .map(|i| format!(" (expansion step {})", i + 1))
        .unwrap_or_default();

    let prompt = format!(
        "You are a friendly English pronunciation and fluency coach for Indonesian hospitality workers.\n\
         A student just completed a speaking drill{step_context}. Here are their scores:\n\
         - Pronunciation match: {:.0}%\n\
         - Pace: {:.0} WPM\n\
         - Fluency score: {:.0}%\n\
         - Number of hesitations detected: {}\n\n\
         Give a short, warm, encouraging 2-3 sentence coaching comment. \
         Mention what they did well and ONE specific tip to improve. \
         Keep it spoken-style, no markdown or bullet points.",
        analysis.pronunciation_score,
        analysis.pace_wpm,
        analysis.fluency_score,
        analysis.hesitations.len()
    );

    let client = reqwest::Client::new();
    match client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", groq_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "model": "llama-3.3-70b-versatile",
            "messages": [
                { "role": "system", "content": "You are a friendly English speaking coach. Keep responses brief and encouraging." },
                { "role": "user", "content": prompt }
            ],
            "max_tokens": 150,
            "temperature": 0.7
        }))
        .send()
        .await
    {
        Ok(res) if res.status().is_success() => {
            match res.json::<serde_json::Value>().await {
                Ok(data) => data["choices"][0]["message"]["content"]
                    .as_str()
                    .unwrap_or("")
                    .trim()
                    .to_string(),
                Err(_) => template_feedback(analysis, step_index),
            }
        }
        _ => template_feedback(analysis, step_index),
    }
}

fn template_feedback(
    analysis: &crate::speakup::models::SpeakUpAnalysis,
    _step_index: Option<usize>,
) -> String {
    if analysis.fluency_score >= 80.0 {
        format!(
            "Great job! Your fluency score is {:.0}% and your pace was {:.0} WPM — really solid. \
             Keep it up and try to push your speed a little more next time!",
            analysis.fluency_score, analysis.pace_wpm
        )
    } else if analysis.fluency_score >= 55.0 {
        let hesitations = analysis.hesitations.len();
        format!(
            "Good effort! You scored {:.0}% fluency at {:.0} WPM. \
             {}Try to speak a bit more smoothly and reduce any pauses.",
            analysis.fluency_score,
            analysis.pace_wpm,
            if hesitations > 0 {
                format!("You paused {} time(s) — that's okay, just keep practising. ", hesitations)
            } else {
                String::new()
            }
        )
    } else {
        format!(
            "Keep practising! Your score is {:.0}% — focus on matching the target sentence \
             word-for-word and don't rush. Slow and accurate beats fast and unclear.",
            analysis.fluency_score
        )
    }
}

/// POST /admin/speakup/test-listen
pub async fn speakup_admin_test_listen(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<SpeakUpTestListenRequest>,
) -> Result<axum::response::Response, AppError> {
    let cid = mongodb::bson::oid::ObjectId::parse_str(&payload.content_id)
        .map_err(|_| AppError::BadRequest("Invalid content_id".to_string()))?;

    let db = state.db.database("rustapi");
    let content_col: Collection<SpeakUpContent> = db.collection("speakup_content");
    let content = content_col.find_one(doc! { "_id": cid }).await?
        .ok_or(AppError::NotFound("Content not found".to_string()))?;

    let target_text = match content.content_type {
        crate::speakup::models::SpeakUpType::Expansion => {
            if let Some(steps) = &content.steps {
                if let Some(idx) = payload.step_index {
                    steps.get(idx).cloned().unwrap_or_default()
                } else {
                    steps.join(" ")
                }
            } else {
                content.transcript.clone()
            }
        }
        _ => content.transcript.clone(),
    };

    if target_text.trim().is_empty() {
        return Err(AppError::BadRequest("Target text is empty for listening".to_string()));
    }

    let config_col: Collection<crate::voice::models::VoiceConfig> = db.collection("voice_configs");
    let config = config_col.find_one(doc! {}).await?.ok_or(AppError::InternalServerError)?;

    let tts = crate::voice::elevenlabs::ElevenLabsTTS::new(config.elevenlabs_api_key);
    use crate::voice::traits::TextToSpeech;
    let audio_bytes = tts.synthesize(&target_text, &config.elevenlabs_voice_id).await.map_err(|e| {
        eprintln!("TTS failed: {:?}", e);
        AppError::InternalServerError
    })?;

    Ok((
        StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "audio/mpeg")],
        audio_bytes,
    ).into_response())
}
