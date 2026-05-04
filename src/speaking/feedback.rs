use std::sync::Arc;
use crate::handlers::{AppState, AppError};
use super::models::{SpeakingSession, SessionScores};

pub struct FeedbackEngine {
    #[allow(dead_code)]
    state: Arc<AppState>,
}

impl FeedbackEngine {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    pub async fn generate_feedback(&self, session: &SpeakingSession) -> Result<SessionScores, AppError> {
        let api_key = std::env::var("ANTHROPIC_API_KEY").map_err(|_| {
            eprintln!("ANTHROPIC_API_KEY not set");
            AppError::InternalServerError
        })?;

        // 1. Build the transcript string
        let mut transcript_text = String::new();
        for turn in &session.turns {
            transcript_text.push_str(&format!("{}: {}\n", turn.role, turn.transcript));
        }

        // 2. Build the analysis prompt
        let prompt = format!(
            "Analyze the following English speaking practice transcript.\n\
            Topic: {}\n\
            Target Level: {:?}\n\n\
            Transcript:\n\
            {}\n\n\
            Evaluate the 'user' on the following out of 100:\n\
            1. Fluency (flow and coherence)\n\
            2. Grammar\n\
            3. Vocabulary (range and appropriate usage)\n\
            4. Politeness (appropriateness for hospitality setting)\n\
            5. Task Completion (did they address the scenario?)\n\n\
            Also provide overall feedback notes and a list of specific grammar corrections for the user's lines.\n\
            You MUST respond in ONLY valid JSON matching this schema:\n\
            {{\n\
                \"fluency\": number,\n\
                \"grammar\": number,\n\
                \"vocabulary\": number,\n\
                \"politeness\": number,\n\
                \"task_completion\": number,\n\
                \"overall_score\": number,\n\
                \"feedback_notes\": \"string\",\n\
                \"grammar_corrections\": [\n\
                    {{ \"original_text\": \"string\", \"corrected_text\": \"string\", \"explanation\": \"string\" }}\n\
                ]\n\
            }}",
            session.topic, session.level, transcript_text
        );

        // 3. Call Anthropic API
        let client = reqwest::Client::new();
        let res = client.post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&serde_json::json!({
                "model": "claude-3-haiku-20240307",
                "max_tokens": 1024,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.2
            }))
            .send()
            .await
            .map_err(|e| {
                eprintln!("Feedback Engine API request error: {:?}", e);
                AppError::InternalServerError
            })?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            eprintln!("Feedback Engine API error {}: {}", status, body);
            return Err(AppError::InternalServerError);
        }

        let data: serde_json::Value = res.json().await.map_err(|e| {
            eprintln!("Feedback Engine API parse error: {:?}", e);
            AppError::InternalServerError
        })?;

        let json_str = data["content"][0]["text"]
            .as_str()
            .unwrap_or("{}");

        // Attempt to parse JSON. Claude sometimes wraps it in markdown blocks
        let clean_json = json_str.replace("```json", "").replace("```", "").trim().to_string();

        let scores: SessionScores = serde_json::from_str(&clean_json).map_err(|e| {
            eprintln!("Feedback Engine JSON parse error: {:?} on string {}", e, clean_json);
            AppError::InternalServerError
        })?;

        Ok(scores)
    }

    pub fn calculate_xp(scores: &SessionScores) -> i32 {
        let base_xp = 10;
        let performance_bonus = (scores.overall_score as f32 / 10.0).round() as i32;
        base_xp + performance_bonus
    }
}
