use serde::{Deserialize, Serialize};
use crate::handlers::AppError;
use crate::content::models::LlmApiKey;
use crate::ai::service::call_llm_for_course;
use futures::TryStreamExt;
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
    // 1. Get AI Key (try all active keys)
    let key_col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");
    let cursor = key_col.find(doc! { "is_active": true }).await?;
    let active_keys: Vec<LlmApiKey> = cursor.try_collect().await?;

    if active_keys.is_empty() {
        crate::notification::notify_admins(&state.db, "AI API Keys Empty", "No active LLM API keys found for evaluation. Please add or activate keys.").await;
        return Err(AppError::BadRequest("No active LLM API key found.".to_string()));
    }

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
    let mut last_error = None;
    let mut response_text = String::new();
    let mut success = false;
    
    for key in active_keys {
        match call_llm_for_course(&key, &prompt).await {
            Ok(resp) => {
                response_text = resp.text;
                success = true;
                break;
            }
            Err(e) => {
                last_error = Some(e);
            }
        }
    }
    
    if !success {
        crate::notification::notify_admins(&state.db, "AI API Keys Exhausted", "All active AI API keys failed during evaluation.").await;
        return Err(last_error.unwrap_or(AppError::InternalServerError));
    }
    
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
    let cursor = key_col.find(doc! { "is_active": true }).await?;
    let active_keys: Vec<LlmApiKey> = cursor.try_collect().await?;

    if active_keys.is_empty() {
        crate::notification::notify_admins(&state.db, "AI API Keys Empty", "No active LLM API keys found for evaluation. Please add or activate keys.").await;
        return Err(AppError::BadRequest("No active LLM API key found.".to_string()));
    }

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

    let mut last_error = None;
    let mut response_text = String::new();
    let mut success = false;
    
    for key in active_keys {
        match call_llm_for_course(&key, &prompt).await {
            Ok(resp) => {
                response_text = resp.text;
                success = true;
                break;
            }
            Err(e) => {
                last_error = Some(e);
            }
        }
    }
    
    if !success {
        crate::notification::notify_admins(&state.db, "AI API Keys Exhausted", "All active AI API keys failed during session summary.").await;
        return Err(last_error.unwrap_or(AppError::InternalServerError));
    }
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

#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedScenario {
    pub title: String,
    pub description: String,
    pub role_ai: String,
    pub role_user: String,
    pub initial_message: String,
    pub context: String,
    pub target_vocabulary: Vec<String>,
}

pub async fn generate_speaking_scenario(
    state: &Arc<AppState>,
    topic: &str,
    level: &str,
) -> Result<GeneratedScenario, AppError> {
    let key_col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");
    let cursor = key_col.find(doc! { "is_active": true }).await?;
    let active_keys: Vec<LlmApiKey> = cursor.try_collect().await?;

    if active_keys.is_empty() {
        crate::notification::notify_admins(&state.db, "AI API Keys Empty", "No active LLM API keys found for generation. Please add or activate keys.").await;
        return Err(AppError::BadRequest("No active LLM API key found.".to_string()));
    }

    let prompt_col: Collection<crate::content::models::AIPromptConfig> = state.db.database("rustapi").collection("ai_prompts");
    let custom_prompt = prompt_col.find_one(doc! { "entity_type": "scenario" }).await.ok().flatten();
    let prompt = if let Some(p) = custom_prompt {
        p.prompt_template
            .replace("{context}", topic)
            .replace("{level}", level)
    } else {
        format!(
            r#"You are an expert curriculum designer for hospitality English training.
Generate a realistic, high-quality speaking practice scenario based on this topic: "{}"
The target student level is: {}

## Format Requirement
Return ONLY a JSON object with this exact structure:
{{
  "title": "Clear scenario title",
  "description": "Short 1-sentence description of the learning goal",
  "role_ai": "The persona for the AI coach (e.g. Grumpy Guest)",
  "role_user": "The persona for the student (e.g. Front Desk Receptionist)",
  "initial_message": "The very first line the AI says to start the roleplay",
  "context": "Hidden instructions for the AI: details about the situation, the AI's mood, and what it wants from the student. Keep it professional but engaging.",
  "target_vocabulary": ["word1", "word2", "word3", "word4", "word5"]
}}
"#,
            topic, level
        )
    };

    let mut last_error = None;
    let mut response_text = String::new();
    let mut success = false;
    
    for key in active_keys {
        match call_llm_for_course(&key, &prompt).await {
            Ok(resp) => {
                response_text = resp.text;
                success = true;
                break;
            }
            Err(e) => {
                last_error = Some(e);
            }
        }
    }
    
    if !success {
        crate::notification::notify_admins(&state.db, "AI API Keys Exhausted", "All active AI API keys failed during scenario generation.").await;
        return Err(last_error.unwrap_or(AppError::InternalServerError));
    }
    let cleaned = response_text.trim();
    let cleaned = if cleaned.starts_with("```") {
        let start = cleaned.find('\n').map(|i| i + 1).unwrap_or(0);
        let end = cleaned.rfind("```").unwrap_or(cleaned.len());
        &cleaned[start..end]
    } else {
        cleaned
    };

    let scenario: GeneratedScenario = serde_json::from_str(cleaned)
        .map_err(|e| AppError::BadRequest(format!("AI scenario generation failed: {}", e)))?;

    Ok(scenario)
}
