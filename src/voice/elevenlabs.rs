use super::traits::TextToSpeech;
use crate::handlers::AppError;

pub struct ElevenLabsTTS {
    api_key: String,
    client: reqwest::Client,
}

impl ElevenLabsTTS {
    pub fn new(api_key: String) -> Self {
        Self { api_key, client: reqwest::Client::new() }
    }
}

impl TextToSpeech for ElevenLabsTTS {
    async fn synthesize(&self, text: &str, voice_id: &str) -> Result<Vec<u8>, AppError> {
        let url = format!("https://api.elevenlabs.io/v1/text-to-speech/{}?output_format=mp3_44100_128", voice_id);
        
        let res = self.client.post(&url)
            .header("xi-api-key", &self.api_key)
            .json(&serde_json::json!({
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }))
            .send()
            .await
            .map_err(|e| {
                eprintln!("ElevenLabs request failed: {}", e);
                AppError::InternalServerError
            })?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            eprintln!("ElevenLabs API error {}: {}", status, body);
            
            if status == 401 {
                return Err(AppError::BadRequest("Invalid ElevenLabs API Key".to_string()));
            }
            
            return Err(AppError::InternalServerError);
        }

        let bytes = res.bytes().await.map_err(|_| AppError::InternalServerError)?;
        Ok(bytes.to_vec())
    }
}
