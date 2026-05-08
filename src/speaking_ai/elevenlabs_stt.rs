use crate::handlers::AppError;
use super::models::ElevenLabsSttResponse;

/// Calls the ElevenLabs Speech-to-Text API (v1/speech-to-text).
///
/// Accepts raw audio bytes + MIME type.
/// Returns the plain transcript string.
pub struct ElevenLabsSTT {
    api_key: String,
    client: reqwest::Client,
}

impl ElevenLabsSTT {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            client: reqwest::Client::new(),
        }
    }

    /// Transcribe audio bytes using ElevenLabs /v1/speech-to-text.
    ///
    /// `language` should be a BCP-47 code (e.g. "en", "id"). Defaults to "en".
    pub async fn transcribe(
        &self,
        audio_bytes: Vec<u8>,
        mime_type: &str,
        language: Option<&str>,
    ) -> Result<String, AppError> {
        // ElevenLabs STT expects multipart/form-data with a "file" part
        // and an optional "language_code" part.
        let lang = language.unwrap_or("en");

        // Determine a sensible filename extension from the MIME type so
        // ElevenLabs can parse the file correctly.
        let extension = mime_to_ext(mime_type);
        let filename = format!("audio.{}", extension);

        let file_part = reqwest::multipart::Part::bytes(audio_bytes)
            .file_name(filename)
            .mime_str(mime_type)
            .map_err(|e| {
                eprintln!("ElevenLabs STT: invalid MIME type '{}': {}", mime_type, e);
                AppError::InternalServerError
            })?;

        let form = reqwest::multipart::Form::new()
            .part("file", file_part)
            .text("language_code", lang.to_string())
            .text("model_id", "scribe_v1"); // ElevenLabs Scribe v1 — best accuracy

        let res = self
            .client
            .post("https://api.elevenlabs.io/v1/speech-to-text")
            .header("xi-api-key", &self.api_key)
            .multipart(form)
            .send()
            .await
            .map_err(|e| {
                eprintln!("ElevenLabs STT request failed: {}", e);
                AppError::InternalServerError
            })?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            eprintln!("ElevenLabs STT error {}: {}", status, body);

            if status == 401 {
                return Err(AppError::BadRequest(
                    "Invalid ElevenLabs API key for STT".to_string(),
                ));
            }
            return Err(AppError::InternalServerError);
        }

        let stt_res: ElevenLabsSttResponse =
            res.json().await.map_err(|e| {
                eprintln!("ElevenLabs STT parse error: {}", e);
                AppError::InternalServerError
            })?;

        Ok(stt_res.text.trim().to_string())
    }
}

/// Convert a MIME type string to a common audio file extension.
fn mime_to_ext(mime: &str) -> &str {
    match mime {
        "audio/mpeg" | "audio/mp3"           => "mp3",
        "audio/mp4" | "video/mp4"            => "mp4",
        "audio/webm" | "video/webm"          => "webm",
        "audio/ogg"                          => "ogg",
        "audio/wav" | "audio/wave"           => "wav",
        "audio/aac"                          => "aac",
        "audio/flac"                         => "flac",
        _                                    => "mp4", // safe default
    }
}
