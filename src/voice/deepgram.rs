use super::traits::SpeechToText;
use crate::handlers::AppError;

pub struct DeepgramSTT {
    api_key: String,
    client: reqwest::Client,
}

impl DeepgramSTT {
    pub fn new(api_key: String) -> Self {
        Self { api_key, client: reqwest::Client::new() }
    }
}

impl SpeechToText for DeepgramSTT {
    async fn transcribe(&self, audio_data: Vec<u8>, mime_type: &str) -> Result<String, AppError> {
        let url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true";

        let res = self.client.post(url)
            .header("Authorization", format!("Token {}", self.api_key))
            .header("Content-Type", mime_type)
            .body(audio_data)
            .send()
            .await
            .map_err(|_| AppError::InternalServerError)?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            eprintln!("Deepgram API error {}: {}", status, body);
            return Err(AppError::InternalServerError);
        }

        let data: serde_json::Value = res.json().await.map_err(|_| AppError::InternalServerError)?;
        
        let transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(transcript)
    }
}
