use axum::{
    extract::{State, Json, Multipart},
    response::IntoResponse,
};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use std::sync::Arc;

use crate::handlers::{AppState, AppError};
use crate::voice::models::VoiceConfig;
use crate::voice::elevenlabs::ElevenLabsTTS;
use crate::voice::deepgram::DeepgramSTT;
use crate::voice::traits::TextToSpeech;
use super::elevenlabs_stt::ElevenLabsSTT;
use super::groq::GroqChat;
use super::models::{
    SpeakingAiResponse, SpeakingAiPipeline,
    TextChatRequest, TextChatResponse,
    ChatMessage,
};
use mongodb::Collection;
use bson::doc;

// ──────────────────────────────────────────────────────────────
// Helper: load VoiceConfig from DB (or return defaults)
// ──────────────────────────────────────────────────────────────
async fn load_voice_config(state: &AppState) -> Result<VoiceConfig, AppError> {
    let col: Collection<VoiceConfig> =
        state.db.database("rustapi").collection("voice_configs");
    col.find_one(doc! {})
        .await?
        .ok_or(AppError::BadRequest(
            "Voice config not set. Please configure STT/TTS keys in Admin → Voice Config.".to_string(),
        ))
}

// ──────────────────────────────────────────────────────────────
// Helper: Groq API key from env (with fallback instructions)
// ──────────────────────────────────────────────────────────────
fn groq_api_key() -> Result<String, AppError> {
    std::env::var("GROQ_API_KEY").map_err(|_| {
        AppError::BadRequest(
            "GROQ_API_KEY not set. Add it to your .env file.".to_string(),
        )
    })
}

// ──────────────────────────────────────────────────────────────
// Helper: run TTS using the configured (or requested) provider
// ──────────────────────────────────────────────────────────────
async fn synthesize_reply(
    text: &str,
    tts_provider_override: Option<&str>,
    voice_id_override: Option<&str>,
    config: &VoiceConfig,
) -> Result<(Vec<u8>, String), AppError> {
    let provider = tts_provider_override
        .unwrap_or(&config.tts_provider)
        .to_lowercase();

    match provider.as_str() {
        "deepgram" => {
            // Deepgram TTS — returns audio bytes directly
            let stt = DeepgramSTT::new(config.deepgram_api_key.clone());
            // DeepgramSTT is a STT struct — for TTS with Deepgram we use their
            // dedicated Aura TTS endpoint via a small inline call since the
            // existing voice module does not yet wrap it.
            let _ = stt; // keep lint happy; we implement inline below
            let audio = call_deepgram_tts(&config.deepgram_api_key, text).await?;
            Ok((audio, "deepgram".to_string()))
        }
        _ => {
            // Default: ElevenLabs TTS
            let tts = ElevenLabsTTS::new(config.elevenlabs_api_key.clone());
            let voice_id = voice_id_override
                .map(|v| v.to_string())
                .unwrap_or_else(|| config.elevenlabs_voice_id.clone());
            let audio = tts.synthesize(text, &voice_id).await?;
            Ok((audio, "elevenlabs".to_string()))
        }
    }
}

/// Inline Deepgram Aura TTS call.
/// Returns raw MP3 bytes.
async fn call_deepgram_tts(api_key: &str, text: &str) -> Result<Vec<u8>, AppError> {
    let client = reqwest::Client::new();

    // Deepgram Aura TTS — text in query param, body = plain text
    let url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en";

    let res = client
        .post(url)
        .header("Authorization", format!("Token {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "text": text }))
        .send()
        .await
        .map_err(|e| {
            eprintln!("Deepgram TTS request failed: {}", e);
            AppError::InternalServerError
        })?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        eprintln!("Deepgram TTS error {}: {}", status, body);
        return Err(AppError::InternalServerError);
    }

    let bytes = res.bytes().await.map_err(|_| AppError::InternalServerError)?;
    Ok(bytes.to_vec())
}

// ══════════════════════════════════════════════════════════════
// POST /speaking-ai/chat  (multipart: audio file + metadata)
//
// Full pipeline:
//   audio  ──► ElevenLabs STT ──► transcript
//   transcript ──► Groq AI ──► reply_text
//   reply_text ──► ElevenLabs / Deepgram TTS ──► audio_base64
// ══════════════════════════════════════════════════════════════
pub async fn voice_chat(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    // ── 1. Parse multipart fields ──────────────────────────────
    let mut audio_bytes: Vec<u8> = Vec::new();
    let mut mime_type = String::from("audio/mp4");
    let mut language: Option<String> = None;
    let mut context: Option<String> = None;
    let mut voice_id: Option<String> = None;
    let mut tts_provider_req: Option<String> = None;

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        match field.name() {
            Some("file") | Some("audio") => {
                if let Some(ct) = field.content_type() {
                    mime_type = ct.to_string();
                }
                audio_bytes = field.bytes().await.unwrap_or_default().to_vec();
            }
            Some("language") => {
                language = Some(
                    field.text().await.unwrap_or_else(|_| "en".to_string()),
                );
            }
            Some("context") => {
                context = Some(field.text().await.unwrap_or_default());
            }
            Some("voice_id") => {
                voice_id = Some(field.text().await.unwrap_or_default());
            }
            Some("tts_provider") => {
                tts_provider_req = Some(field.text().await.unwrap_or_default());
            }
            _ => {} // ignore unknown fields
        }
    }

    if audio_bytes.is_empty() {
        return Err(AppError::BadRequest(
            "No audio file provided. Send a 'file' or 'audio' field.".to_string(),
        ));
    }

    // ── 2. Load config & API keys ──────────────────────────────
    let config = load_voice_config(&state).await?;
    let groq_key = groq_api_key()?;

    // ── 3. STT: ElevenLabs Scribe ─────────────────────────────
    let stt = ElevenLabsSTT::new(&config.elevenlabs_api_key);
    let transcript = stt
        .transcribe(audio_bytes, &mime_type, language.as_deref())
        .await?;

    if transcript.is_empty() {
        return Err(AppError::BadRequest(
            "Could not transcribe audio. Please try speaking more clearly.".to_string(),
        ));
    }

    // ── 4. LLM: Groq reply ────────────────────────────────────
    let system_prompt = context.as_deref().map(|ctx| {
        format!(
            "You are a friendly English conversation tutor for hospitality workers in Indonesia. \
             Keep replies brief (1-3 sentences), natural, spoken-style — no markdown. \
             Current topic/context: {}",
            ctx
        )
    });

    let groq = GroqChat::new(groq_key);
    let reply_text = groq
        .reply(&transcript, &[], system_prompt.as_deref())
        .await?;

    // ── 5. TTS: synthesize the reply ──────────────────────────
    let (audio_data, actual_tts_provider) = synthesize_reply(
        &reply_text,
        tts_provider_req.as_deref(),
        voice_id.as_deref(),
        &config,
    )
    .await?;

    let audio_base64 = BASE64.encode(&audio_data);

    Ok(Json(SpeakingAiResponse {
        transcript,
        reply_text,
        audio_base64,
        audio_mime: "audio/mpeg".to_string(),
        pipeline: SpeakingAiPipeline {
            stt_provider: "elevenlabs".to_string(),
            llm_provider: "groq/llama-3.3-70b-versatile".to_string(),
            tts_provider: actual_tts_provider,
        },
    }))
}

// ══════════════════════════════════════════════════════════════
// POST /speaking-ai/text-chat  (JSON body, no audio upload)
//
// Accepts a text message + optional chat history.
// Returns reply_text + TTS audio as base64.
// Useful for text-based chat UI that still wants voice output.
// ══════════════════════════════════════════════════════════════
pub async fn text_chat(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TextChatRequest>,
) -> Result<impl IntoResponse, AppError> {
    // ── 1. Load config & Groq key ──────────────────────────────
    let config = load_voice_config(&state).await?;
    let groq_key = groq_api_key()?;

    // ── 2. Build system prompt ─────────────────────────────────
    let system_prompt = payload.context.as_deref().map(|ctx| {
        format!(
            "You are a friendly English conversation tutor for hospitality workers in Indonesia. \
             Keep replies brief (1-3 sentences), natural, spoken-style — no markdown. \
             Current topic/context: {}",
            ctx
        )
    });

    // ── 3. Groq chat ──────────────────────────────────────────
    let history: Vec<ChatMessage> = payload.history.unwrap_or_default();
    let groq = GroqChat::new(groq_key);
    let reply_text = groq
        .reply(&payload.message, &history, system_prompt.as_deref())
        .await?;

    // ── 4. TTS ────────────────────────────────────────────────
    let (audio_data, actual_tts_provider) = synthesize_reply(
        &reply_text,
        payload.tts_provider.as_deref(),
        payload.voice_id.as_deref(),
        &config,
    )
    .await?;

    let audio_base64 = BASE64.encode(&audio_data);

    Ok(Json(TextChatResponse {
        reply_text,
        audio_base64,
        audio_mime: "audio/mpeg".to_string(),
        pipeline: SpeakingAiPipeline {
            stt_provider: "none".to_string(),
            llm_provider: "groq/llama-3.3-70b-versatile".to_string(),
            tts_provider: actual_tts_provider,
        },
    }))
}

// ══════════════════════════════════════════════════════════════
// POST /speaking-ai/transcribe  (multipart: audio only)
//
// Pure STT endpoint — returns only the transcript.
// Useful for client-side debouncing / live captions.
// ══════════════════════════════════════════════════════════════
pub async fn transcribe_only(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let mut audio_bytes: Vec<u8> = Vec::new();
    let mut mime_type = String::from("audio/mp4");
    let mut language: Option<String> = None;

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        match field.name() {
            Some("file") | Some("audio") => {
                if let Some(ct) = field.content_type() {
                    mime_type = ct.to_string();
                }
                audio_bytes = field.bytes().await.unwrap_or_default().to_vec();
            }
            Some("language") => {
                language = Some(field.text().await.unwrap_or_else(|_| "en".to_string()));
            }
            _ => {}
        }
    }

    if audio_bytes.is_empty() {
        return Err(AppError::BadRequest("No audio file provided.".to_string()));
    }

    let config = load_voice_config(&state).await?;
    let stt = ElevenLabsSTT::new(&config.elevenlabs_api_key);
    let transcript = stt
        .transcribe(audio_bytes, &mime_type, language.as_deref())
        .await?;

    Ok(Json(serde_json::json!({
        "transcript": transcript,
        "provider": "elevenlabs/scribe_v1"
    })))
}

// ══════════════════════════════════════════════════════════════
// POST /speaking-ai/tts  (JSON: text → audio)
//
// Standalone TTS endpoint — same as /voice/tts but
// always returns base64 JSON (friendlier for mobile).
// ══════════════════════════════════════════════════════════════
#[derive(serde::Deserialize)]
pub struct TtsOnlyRequest {
    pub text: String,
    pub voice_id: Option<String>,
    pub provider: Option<String>, // "elevenlabs" | "deepgram"
}

pub async fn tts_only(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TtsOnlyRequest>,
) -> Result<impl IntoResponse, AppError> {
    if payload.text.trim().is_empty() {
        return Err(AppError::BadRequest("'text' field is required.".to_string()));
    }

    let config = load_voice_config(&state).await?;

    let (audio_data, provider_used) = synthesize_reply(
        &payload.text,
        payload.provider.as_deref(),
        payload.voice_id.as_deref(),
        &config,
    )
    .await?;

    let audio_base64 = BASE64.encode(&audio_data);

    Ok(Json(serde_json::json!({
        "audio_base64": audio_base64,
        "audio_mime": "audio/mpeg",
        "provider": provider_used
    })))
}
