use serde::{Deserialize, Serialize};
use crate::handlers::AppError;
use crate::content::handlers::call_gemini_pub;
use crate::content::models::LlmApiKey;
use mongodb::{Collection, bson::doc};
use crate::handlers::AppState;
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
pub struct EvaluationResult {
    pub score: f64,
    pub pronunciation_score: f64,
    pub grammar_score: f64,
    pub vocabulary_score: f64,
    pub better_answer: String,
    pub feedback: String,
    pub next_ai_response: String,
    pub is_final: bool,
}

pub async fn evaluate_speaking_turn(
    state: &Arc<AppState>,
    scenario_context: &str,
    target_vocab: &[String],
    conversation_history: &str,
    user_transcript: &str,
) -> Result<EvaluationResult, AppError> {
    // 1. Get AI Key (prefer Gemini for cost efficiency in conversational loops)
    let key_col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");
    let key = key_col.find_one(doc! { "provider": "gemini", "is_active": true }).await?
        .ok_or(AppError::InternalServerError)?;

    // 2. Build Prompt
    let vocab_list = target_vocab.join(", ");
    let prompt = format!(
        r#"You are an expert English language coach for hospitality professionals.
Your task is to evaluate a user's spoken response in a practice scenario and continue the conversation.

## Scenario Context
{}

## Target Vocabulary to use
{}

## Conversation History
{}

## User's Last Response (Transcribed)
"{}"

## Tasks
1. Score the user's response (0-100) on: overall, pronunciation (estimated from transcript quality), grammar, and vocabulary usage.
2. Provide a "better_answer": a highly natural, professional version of what the user tried to say.
3. Provide "feedback": 1-2 short sentences in simple English about their response.
4. Provide "next_ai_response": Your next line in the conversation to keep it going.
5. Set "is_final" to true ONLY if the conversation naturally reached a conclusion.

## Format Requirement
Return ONLY a JSON object with this structure:
{{
  "score": number,
  "pronunciation_score": number,
  "grammar_score": number,
  "vocabulary_score": number,
  "better_answer": "string",
  "feedback": "string",
  "next_ai_response": "string",
  "is_final": boolean
}}
"#,
        scenario_context, vocab_list, conversation_history, user_transcript
    );

    // 3. Call LLM
    let response_text = call_gemini_pub(&key.api_key, &prompt).await?;
    
    // 4. Parse Result
    let cleaned = response_text.trim();
    let cleaned = if cleaned.starts_with("```") {
        let start = cleaned.find('\n').map(|i| i + 1).unwrap_or(0);
        let end = cleaned.rfind("```").unwrap_or(cleaned.len());
        &cleaned[start..end]
    } else {
        cleaned
    };

    let result: EvaluationResult = serde_json::from_str(cleaned)
        .map_err(|e| AppError::BadRequest(format!("AI evaluation failed: {}", e)))?;

    Ok(result)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionSummary {
    pub overall_score: f64,
    pub pronunciation: f64,
    pub grammar: f64,
    pub vocabulary: f64,
    pub fluency: f64,
    pub task_completion: f64,
    pub feedback: String,
}

pub async fn generate_session_summary(
    state: &Arc<AppState>,
    scenario_context: &str,
    full_transcript: &str,
) -> Result<SessionSummary, AppError> {
    let key_col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");
    let key = key_col.find_one(doc! { "provider": "gemini", "is_active": true }).await?
        .ok_or(AppError::InternalServerError)?;

    let prompt = format!(
        r#"You are an expert English language coach. Analyze this full hospitality practice conversation.

## Scenario
{}

## Full Transcript
{}

## Tasks
1. Provide a final overall score (0-100).
2. Provide scores (0-100) for: pronunciation, grammar, vocabulary, fluency, and task_completion.
3. Provide a constructive summary feedback (3-4 sentences) for the student.

## Format Requirement
Return ONLY a JSON object:
{{
  "overall_score": number,
  "pronunciation": number,
  "grammar": number,
  "vocabulary": number,
  "fluency": number,
  "task_completion": number,
  "feedback": "string"
}}
"#,
        scenario_context, full_transcript
    );

    let response_text = call_gemini_pub(&key.api_key, &prompt).await?;
    let cleaned = response_text.trim();
    let cleaned = if cleaned.starts_with("```") {
        let start = cleaned.find('\n').map(|i| i + 1).unwrap_or(0);
        let end = cleaned.rfind("```").unwrap_or(cleaned.len());
        &cleaned[start..end]
    } else {
        cleaned
    };

    let summary: SessionSummary = serde_json::from_str(cleaned)
        .map_err(|e| AppError::BadRequest(format!("AI summary failed: {}", e)))?;

    Ok(summary)
}
