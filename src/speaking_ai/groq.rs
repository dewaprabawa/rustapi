use crate::handlers::AppError;
use super::models::ChatMessage;

/// Groq conversational AI client.
///
/// Uses the Groq Chat Completions API (OpenAI-compatible) with
/// `llama-3.3-70b-versatile` by default — fast and free tier friendly.
pub struct GroqChat {
    api_key: String,
    client: reqwest::Client,
}

impl GroqChat {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            client: reqwest::Client::new(),
        }
    }

    /// Send a conversation turn to Groq and get a text reply.
    ///
    /// `history`  : previous chat turns (user/assistant)
    /// `user_msg` : the latest user utterance
    /// `system`   : optional system prompt (topic / persona)
    pub async fn reply(
        &self,
        user_msg: &str,
        history: &[ChatMessage],
        system: Option<&str>,
    ) -> Result<String, AppError> {
        // Build the messages array
        let mut messages: Vec<serde_json::Value> = Vec::new();

        // System prompt
        let system_content = system.unwrap_or(
            "You are a friendly and encouraging English conversation tutor \
             specialising in hospitality English for Indonesian learners. \
             Keep replies concise (1-3 sentences), natural, and spoken-style. \
             Do NOT use markdown, bullet points, or headings in your replies."
        );
        messages.push(serde_json::json!({
            "role": "system",
            "content": system_content
        }));

        // Historical turns
        for msg in history {
            messages.push(serde_json::json!({
                "role": msg.role,
                "content": msg.content
            }));
        }

        // Current user turn
        messages.push(serde_json::json!({
            "role": "user",
            "content": user_msg
        }));

        let res = self
            .client
            .post("https://api.groq.com/openai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "max_tokens": 256,
                "temperature": 0.75,
                "stream": false
            }))
            .send()
            .await
            .map_err(|e| {
                eprintln!("Groq API request error: {}", e);
                AppError::InternalServerError
            })?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            eprintln!("Groq API error {}: {}", status, body);

            if status == 429 {
                return Err(AppError::TooManyRequests(
                    "Groq rate limit reached. Please try again in a moment.".to_string(),
                ));
            }
            if status == 401 {
                return Err(AppError::BadRequest(
                    "Invalid Groq API key".to_string(),
                ));
            }
            return Err(AppError::InternalServerError);
        }

        let data: serde_json::Value = res.json().await.map_err(|e| {
            eprintln!("Groq API parse error: {}", e);
            AppError::InternalServerError
        })?;

        let reply = data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("Sorry, I didn't quite get that. Could you say that again?")
            .trim()
            .to_string();

        Ok(reply)
    }
}
