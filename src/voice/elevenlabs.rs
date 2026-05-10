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
        if self.api_key.is_empty() {
            println!("⚠️ ElevenLabs API key is empty. Returning dummy audio for '{}'", text);
            // Minimal 44-byte WAV file (1 sec silence)
            let dummy_wav: Vec<u8> = vec![
                b'R', b'I', b'F', b'F', 36, 0, 0, 0, b'W', b'A', b'V', b'E', 
                b'f', b'm', b't', b' ', 16, 0, 0, 0, 1, 0, 1, 0, 
                0x44, 0xAC, 0, 0, 0x88, 0x58, 0x01, 0, 2, 0, 16, 0, 
                b'd', b'a', b't', b'a', 0, 0, 0, 0,
            ];
            return Ok(dummy_wav);
        }

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
            
            println!("⚠️ Falling back to dummy audio due to ElevenLabs error.");
            let dummy_wav: Vec<u8> = vec![
                b'R', b'I', b'F', b'F', 36, 0, 0, 0, b'W', b'A', b'V', b'E', 
                b'f', b'm', b't', b' ', 16, 0, 0, 0, 1, 0, 1, 0, 
                0x44, 0xAC, 0, 0, 0x88, 0x58, 0x01, 0, 2, 0, 16, 0, 
                b'd', b'a', b't', b'a', 0, 0, 0, 0,
            ];
            return Ok(dummy_wav);
        }

        let bytes = res.bytes().await.map_err(|_| AppError::InternalServerError)?;
        Ok(bytes.to_vec())
    }
}
