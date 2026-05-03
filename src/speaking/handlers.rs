use axum::{
    extract::{State, Json, Path, Multipart},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use futures::TryStreamExt;
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;

use crate::handlers::{AppState, AppError};
use crate::models::{User, Admin};
use crate::speaking::models::*;
use crate::ai::evaluation::evaluate_speaking_turn;
use crate::voice::traits::{TextToSpeech, SpeechToText};
use crate::voice::elevenlabs::ElevenLabsTTS;
use crate::voice::deepgram::DeepgramSTT;
use crate::voice::models::VoiceConfig;

/// POST /progress/speaking/sessions/start
pub async fn start_session(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<StartSessionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let scenario_oid = ObjectId::parse_str(&payload.scenario_id).map_err(|_| AppError::BadRequest("Invalid scenario_id".to_string()))?;
    
    // 1. Fetch Scenario
    let scenario_col: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    let scenario = scenario_col.find_one(doc! { "_id": scenario_oid }).await?
        .ok_or(AppError::NotFound)?;

    // 2. Initialize Session
    let session_col: Collection<SpeakingSession> = state.db.database("rustapi").collection("speaking_sessions");
    let session = SpeakingSession {
        id: None,
        user_id: user.id.unwrap(),
        scenario_id: scenario_oid,
        status: "active".to_string(),
        turns: vec![SpeakingTurn {
            role: "ai".to_string(),
            content: scenario.initial_message.clone(),
            audio_url: None, 
            evaluation: None,
            timestamp: Utc::now(),
        }],
        overall_score: None,
        detailed_scores: None,
        feedback: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = session_col.insert_one(session.clone()).await?;
    let mut created = session;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// POST /progress/speaking/sessions/:id/turn
pub async fn session_turn(
    State(state): State<Arc<AppState>>,
    _user: User,
    Path(session_id): Path<String>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    let session_oid = ObjectId::parse_str(&session_id).map_err(|_| AppError::BadRequest("Invalid session_id".to_string()))?;
    
    // 1. Get audio data from multipart
    let mut audio_data = Vec::new();
    let mut mime_type = String::from("audio/mpeg");

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        if field.name() == Some("file") {
            mime_type = field.content_type().map(|s| s.to_string()).unwrap_or(mime_type);
            audio_data = field.bytes().await.unwrap_or_default().to_vec();
            break;
        }
    }

    if audio_data.is_empty() {
        return Err(AppError::BadRequest("No audio file provided".to_string()));
    }

    // 2. Fetch Session & Scenario
    let session_col: Collection<SpeakingSession> = state.db.database("rustapi").collection("speaking_sessions");
    let mut session = session_col.find_one(doc! { "_id": session_oid }).await?
        .ok_or(AppError::NotFound)?;

    let scenario_col: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    let scenario = scenario_col.find_one(doc! { "_id": session.scenario_id }).await?
        .ok_or(AppError::NotFound)?;

    // 3. Transcribe with Deepgram
    let config_col: Collection<VoiceConfig> = state.db.database("rustapi").collection("voice_configs");
    let config = config_col.find_one(doc! {}).await?.ok_or(AppError::InternalServerError)?;
    
    let stt = DeepgramSTT::new(config.deepgram_api_key);
    let transcript: String = stt.transcribe(audio_data, &mime_type).await?;

    // 4. Build Conversation History
    let history = session.turns.iter()
        .map(|t| format!("{}: {}", t.role, t.content))
        .collect::<Vec<_>>()
        .join("\n");

    // 5. Evaluate with AI
    let eval_result = evaluate_speaking_turn(
        &state,
        &scenario.context,
        &scenario.target_vocabulary,
        &history,
        &transcript
    ).await?;

    // 6. Add User Turn & AI Next Turn to Session
    let user_turn = SpeakingTurn {
        role: "user".to_string(),
        content: transcript,
        audio_url: None, 
        evaluation: Some(TurnEvaluation {
            score: eval_result.score,
            pronunciation_score: Some(eval_result.pronunciation_score),
            grammar_score: Some(eval_result.grammar_score),
            vocabulary_score: Some(eval_result.vocabulary_score),
            better_answer: Some(eval_result.better_answer),
            feedback: Some(eval_result.feedback),
        }),
        timestamp: Utc::now(),
    };

    let ai_turn = SpeakingTurn {
        role: "ai".to_string(),
        content: eval_result.next_ai_response,
        audio_url: None,
        evaluation: None,
        timestamp: Utc::now(),
    };

    session.turns.push(user_turn.clone());
    session.turns.push(ai_turn.clone());
    
    if eval_result.is_final {
        session.status = "completed".to_string();
    }

    session.updated_at = Utc::now();
    session_col.replace_one(doc! { "_id": session_oid }, session.clone()).await?;

    // 7. Optional: Generate AI Turn Audio with ElevenLabs
    let tts = ElevenLabsTTS::new(config.elevenlabs_api_key);
    let audio_bytes = tts.synthesize(&ai_turn.content, &config.elevenlabs_voice_id).await.unwrap_or_default();

    // 8. Return turn results + audio
    use base64::{Engine as _, engine::general_purpose};
    let audio_b64 = general_purpose::STANDARD.encode(audio_bytes);
    
    Ok(Json(serde_json::json!({
        "session_status": session.status,
        "transcript": user_turn.content,
        "evaluation": user_turn.evaluation,
        "next_ai_line": ai_turn.content,
        "audio_base64": audio_b64
    })))
}

/// POST /progress/speaking/sessions/:id/end
pub async fn end_session(
    State(state): State<Arc<AppState>>,
    _user: User,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let col: Collection<SpeakingSession> = state.db.database("rustapi").collection("speaking_sessions");
    
    let mut session = col.find_one(doc! { "_id": oid }).await?
        .ok_or(AppError::NotFound)?;

    // 1. Fetch Scenario for context
    let scenario_col: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    let scenario = scenario_col.find_one(doc! { "_id": session.scenario_id }).await?
        .ok_or(AppError::NotFound)?;

    // 2. Build Full Transcript
    let full_transcript = session.turns.iter()
        .map(|t| format!("{}: {}", t.role, t.content))
        .collect::<Vec<_>>()
        .join("\n");

    // 3. Generate Summary with AI
    let summary = crate::ai::evaluation::generate_session_summary(
        &state,
        &scenario.context,
        &full_transcript
    ).await?;

    // 4. Update Session
    session.status = "completed".to_string();
    session.overall_score = Some(summary.overall_score);
    session.feedback = Some(summary.feedback);
    session.detailed_scores = Some(DetailedScores {
        pronunciation: summary.pronunciation,
        grammar: summary.grammar,
        vocabulary: summary.vocabulary,
        fluency: summary.fluency,
        task_completion: summary.task_completion,
    });
    session.updated_at = Utc::now();

    col.replace_one(doc! { "_id": oid }, session.clone()).await?;
    
    Ok(Json(session))
}

/// POST /admin/speaking/test/start/:scenario_id
pub async fn start_test_session(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(scenario_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    println!("🏁 Starting test session for scenario: {}", scenario_id);
    let scenario_oid = ObjectId::parse_str(&scenario_id).map_err(|_| AppError::BadRequest("Invalid scenario_id".to_string()))?;
    let col_scenarios: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    let scenario = col_scenarios.find_one(doc! { "_id": scenario_oid }).await?.ok_or(AppError::NotFound)?;

    let session = SpeakingSession {
        id: None,
        user_id: ObjectId::new(), // Placeholder for test
        scenario_id: scenario_oid,
        status: "active".to_string(),
        turns: vec![SpeakingTurn {
            role: "ai".to_string(),
            content: scenario.initial_message.clone(),
            audio_url: None,
            evaluation: None,
            timestamp: Utc::now(),
        }],
        overall_score: None,
        feedback: None,
        detailed_scores: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let col_sessions: Collection<SpeakingSession> = state.db.database("rustapi").collection("speaking_sessions");
    let result = col_sessions.insert_one(session.clone()).await?;
    let mut created_session = session;
    created_session.id = result.inserted_id.as_object_id();

    Ok(Json(created_session))
}

#[derive(Debug, serde::Deserialize)]
pub struct TestTurnRequest {
    pub text: String,
}

/// POST /admin/speaking/test/turn/:session_id
pub async fn test_session_turn(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(session_id): Path<String>,
    Json(payload): Json<TestTurnRequest>,
) -> Result<impl IntoResponse, AppError> {
    println!("🧪 Test Turn: session_id={}, text='{}'", session_id, payload.text);
    
    let session_oid = ObjectId::parse_str(&session_id).map_err(|e| {
        println!("❌ Invalid session_id: {}", e);
        AppError::BadRequest("Invalid session_id".to_string())
    })?;
    let col_sessions: Collection<SpeakingSession> = state.db.database("rustapi").collection("speaking_sessions");
    let mut session = col_sessions.find_one(doc! { "_id": session_oid }).await?.ok_or(AppError::NotFound)?;

    let col_scenarios: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    let scenario = col_scenarios.find_one(doc! { "_id": session.scenario_id }).await?.ok_or(AppError::NotFound)?;

    // 1. Evaluate with AI
    let history_str = session.turns.iter()
        .map(|t| format!("{}: {}", t.role, t.content))
        .collect::<Vec<_>>()
        .join("\n");

    println!("🤖 Evaluating with AI...");
    let eval_result = evaluate_speaking_turn(
        &state,
        &scenario.context,
        &scenario.target_vocabulary,
        &history_str,
        &payload.text
    ).await.map_err(|e| {
        println!("❌ AI Evaluation failed: {:?}", e);
        e
    })?;
    println!("✅ AI Evaluation success: score={}", eval_result.score);

    // 2. Add Turns
    let user_turn = SpeakingTurn {
        role: "user".to_string(),
        content: payload.text,
        audio_url: None,
        evaluation: Some(TurnEvaluation {
            score: eval_result.score,
            pronunciation_score: Some(eval_result.pronunciation_score),
            grammar_score: Some(eval_result.grammar_score),
            vocabulary_score: Some(eval_result.vocabulary_score),
            better_answer: Some(eval_result.better_answer),
            feedback: Some(eval_result.feedback),
        }),
        timestamp: Utc::now(),
    };

    let ai_turn = SpeakingTurn {
        role: "ai".to_string(),
        content: eval_result.next_ai_response,
        audio_url: None,
        evaluation: None,
        timestamp: Utc::now(),
    };

    session.turns.push(user_turn.clone());
    session.turns.push(ai_turn.clone());
    
    if eval_result.is_final {
        session.status = "completed".to_string();
    }

    session.updated_at = Utc::now();
    col_sessions.replace_one(doc! { "_id": session_oid }, session.clone()).await?;

    Ok(Json(json!({
        "response_text": ai_turn.content,
        "is_final": eval_result.is_final,
        "evaluation": user_turn.evaluation
    })))
}

/// GET /admin/speaking/sessions
pub async fn list_all_sessions(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<SpeakingSession> = state.db.database("rustapi").collection("speaking_sessions");
    let cursor = col.find(doc! {}).sort(doc! { "created_at": -1 }).limit(100).await?;
    let sessions: Vec<SpeakingSession> = cursor.try_collect().await?;
    Ok(Json(sessions))
}

/// GET /progress/speaking/scenarios
pub async fn list_all_scenarios(
    State(state): State<Arc<AppState>>,
    _user: User,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    let cursor = col.find(doc! {}).sort(doc! { "title": 1 }).await?;
    let scenarios: Vec<SpeakingScenario> = cursor.try_collect().await?;
    Ok(Json(scenarios))
}

pub async fn admin_list_all_scenarios(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    let cursor = col.find(doc! {}).sort(doc! { "title": 1 }).await?;
    let scenarios: Vec<SpeakingScenario> = cursor.try_collect().await?;
    Ok(Json(scenarios))
}

/// POST /admin/speaking/scenarios
pub async fn create_speaking_scenario(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(mut scenario): Json<SpeakingScenario>,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    
    scenario.created_at = Utc::now();
    scenario.updated_at = Utc::now();
    
    let result = col.insert_one(scenario.clone()).await?;
    let mut created = scenario;
    created.id = result.inserted_id.as_object_id();
    
    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/speaking/scenarios/:id
pub async fn get_speaking_scenario(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let col: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    let scenario = col.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound)?;
    Ok(Json(scenario))
}

/// PUT /admin/speaking/scenarios/:id
pub async fn update_speaking_scenario(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(mut scenario): Json<SpeakingScenario>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let col: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    
    scenario.updated_at = Utc::now();
    // Ensure the ID from path is set in the document
    scenario.id = Some(oid);
    
    col.replace_one(doc! { "_id": oid }, scenario.clone()).await?;
    Ok(Json(scenario))
}

/// DELETE /admin/speaking/scenarios/:id
pub async fn delete_speaking_scenario(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    let col: Collection<SpeakingScenario> = state.db.database("rustapi").collection("speaking_scenarios");
    col.delete_one(doc! { "_id": oid }).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct GenerateScenarioRequest {
    pub topic: String,
    pub level: String,
}

/// POST /admin/speaking/scenarios/ai-generate
pub async fn ai_generate_speaking_scenario(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<GenerateScenarioRequest>,
) -> Result<impl IntoResponse, AppError> {
    let result = crate::ai::evaluation::generate_speaking_scenario(
        &state,
        &payload.topic,
        &payload.level
    ).await?;
    
    Ok(Json(result))
}
