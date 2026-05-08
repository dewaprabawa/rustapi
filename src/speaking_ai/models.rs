use serde::{Deserialize, Serialize};

// ============================================================
// Request: mobile sends audio + optional context
// ============================================================

/// Sent as multipart/form-data from the mobile app.
///
/// Fields:
///   - `file`          : audio bytes (required, any common format: webm, mp4, mp3, wav, ogg)
///   - `session_id`    : opaque string the client uses to group turns (optional)
///   - `context`       : free-text describing the current scenario / topic (optional)
///   - `language`      : BCP-47 language code for STT, default "en" (optional)
///   - `voice_id`      : ElevenLabs voice id for the TTS reply (optional, falls back to config)
///   - `tts_provider`  : "elevenlabs" | "deepgram" — overrides config (optional)
pub struct SpeakingAiMultipart {
    pub audio_bytes: Vec<u8>,
    pub mime_type: String,
    pub session_id: Option<String>,
    pub context: Option<String>,
    pub language: Option<String>,
    pub voice_id: Option<String>,
    pub tts_provider: Option<String>,
}

// ============================================================
// Response: text + base64-encoded MP3 audio
// ============================================================

#[derive(Debug, Serialize)]
pub struct SpeakingAiResponse {
    /// What the user actually said (from STT)
    pub transcript: String,

    /// The AI reply text (from Groq)
    pub reply_text: String,

    /// Base64-encoded MP3 audio of the AI reply (from TTS)
    pub audio_base64: String,

    /// MIME type of the audio payload, always "audio/mpeg"
    pub audio_mime: String,

    /// Provider chain used, for debugging / logging
    pub pipeline: SpeakingAiPipeline,
}

#[derive(Debug, Serialize)]
pub struct SpeakingAiPipeline {
    pub stt_provider: String,
    pub llm_provider: String,
    pub tts_provider: String,
}

// ============================================================
// Optional: Groq conversational history (for multi-turn)
// ============================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,    // "user" | "assistant" | "system"
    pub content: String,
}

/// Request body for the JSON-only (no audio) chat endpoint.
#[derive(Debug, Deserialize)]
pub struct TextChatRequest {
    pub message: String,
    pub history: Option<Vec<ChatMessage>>,
    pub context: Option<String>,
    pub voice_id: Option<String>,
    pub tts_provider: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TextChatResponse {
    pub reply_text: String,
    pub audio_base64: String,
    pub audio_mime: String,
    pub pipeline: SpeakingAiPipeline,
}

// ============================================================
// ElevenLabs STT response shape
// ============================================================

/// Partial shape of the ElevenLabs /v1/speech-to-text response.
#[derive(Debug, Deserialize)]
pub struct ElevenLabsSttResponse {
    pub text: String,
}
