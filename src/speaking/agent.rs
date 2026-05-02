use std::sync::Arc;
use crate::handlers::{AppState, AppError};
use super::models::SpeakingSession;

pub struct ClaudeAgent {
    #[allow(dead_code)]
    state: Arc<AppState>,
}

impl ClaudeAgent {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    pub async fn generate_reply(&self, session: &SpeakingSession) -> Result<(String, bool), AppError> {
        let api_key = std::env::var("ANTHROPIC_API_KEY").map_err(|_| {
            eprintln!("ANTHROPIC_API_KEY not set");
            AppError::InternalServerError
        })?;

        // 1. Build System Prompt based on the session parameters
        let system_prompt = format!(
            "You are an AI English tutor conducting a role-play speaking practice session.\n\
            Category: {:?}\n\
            Level: {:?}\n\
            Topic: {}\n\n\
            Rules:\n\
            1. Stay in character and respond naturally to the user as if you are in the given scenario.\n\
            2. Keep responses brief (1-3 sentences) suitable for spoken conversation.\n\
            3. Do NOT provide translation or explicit grammar corrections during the role-play. Just converse naturally.\n\
            4. Adjust your vocabulary complexity to the {:?} level.\n\
            5. If the conversation reaches a natural conclusion or the user says goodbye, append EXACTLY '[SESSION_COMPLETE]' to the very end of your message.",
            session.category, session.level, session.topic, session.level
        );

        // 2. Build Message History
        let mut messages = Vec::new();
        for turn in &session.turns {
            let role = if turn.role == "ai" { "assistant" } else { "user" };
            messages.push(serde_json::json!({
                "role": role,
                "content": turn.transcript
            }));
        }

        // 3. Call Anthropic API (using Haiku for fast conversational latency)
        let client = reqwest::Client::new();
        let res = client.post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&serde_json::json!({
                "model": "claude-3-haiku-20240307",
                "system": system_prompt,
                "max_tokens": 256,
                "messages": messages,
                "temperature": 0.7
            }))
            .send()
            .await
            .map_err(|e| {
                eprintln!("Claude Agent API request error: {:?}", e);
                AppError::InternalServerError
            })?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            eprintln!("Claude Agent API error {}: {}", status, body);
            return Err(AppError::InternalServerError);
        }

        let data: serde_json::Value = res.json().await.map_err(|e| {
            eprintln!("Claude Agent API parse error: {:?}", e);
            AppError::InternalServerError
        })?;

        let mut ai_reply = data["content"][0]["text"]
            .as_str()
            .unwrap_or("I'm sorry, I didn't quite catch that.")
            .to_string();

        // 4. Check for completion trigger
        let mut is_complete = false;
        if ai_reply.contains("[SESSION_COMPLETE]") {
            is_complete = true;
            ai_reply = ai_reply.replace("[SESSION_COMPLETE]", "").trim().to_string();
        }

        // Safety fallback: if conversation goes on too long
        if session.turns.len() >= 20 {
            is_complete = true;
        }

        Ok((ai_reply, is_complete))
    }
}
