use axum::{
    extract::{State, Json, Path},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::interview_models::{InterviewSession, TranscriptEntry, InterviewScenario, InterviewQuestion};
use crate::models::User;
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;
use futures::TryStreamExt;

#[derive(Debug, serde::Deserialize)]
pub struct ChatRequest {
    pub message: String,
}

#[derive(Debug, serde::Serialize)]
pub struct ChatResponse {
    pub reply: String,
    pub session: InterviewSession,
}

/// POST /api/interviews/:scenario_id/start
pub async fn start_interview_session(
    State(state): State<Arc<AppState>>,
    user: User,
    Path(scenario_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let s_id = ObjectId::parse_str(&scenario_id).map_err(|_| AppError::NotFound)?;
    
    // Verify scenario exists
    let scenario_coll: Collection<InterviewScenario> = state.db.database("rustapi").collection("interview_scenarios");
    let _scenario = scenario_coll.find_one(doc! { "_id": s_id }).await?
        .ok_or(AppError::NotFound)?;

    let session_coll: Collection<InterviewSession> = state.db.database("rustapi").collection("interview_sessions");

    let session = InterviewSession {
        id: None,
        user_id: user.id.unwrap(),
        scenario_id: s_id,
        score: None,
        pronunciation_score: None,
        grammar_score: None,
        fluency_score: None,
        transcript: vec![
            // Initial greeting from interviewer could go here, or handled by the app/AI
        ],
        feedback: None,
        duration_seconds: None,
        completed: false,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = session_coll.insert_one(session.clone()).await?;
    let mut created = session;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// POST /api/interviews/sessions/:session_id/chat
/// This acts as the proxy to your AI Engine (OpenAI)
pub async fn send_chat_message(
    State(state): State<Arc<AppState>>,
    user: User,
    Path(session_id): Path<String>,
    Json(payload): Json<ChatRequest>,
) -> Result<impl IntoResponse, AppError> {
    let sess_id = ObjectId::parse_str(&session_id).map_err(|_| AppError::NotFound)?;
    let session_coll: Collection<InterviewSession> = state.db.database("rustapi").collection("interview_sessions");

    let mut session = session_coll.find_one(doc! { "_id": sess_id, "user_id": user.id.unwrap() }).await?
        .ok_or(AppError::NotFound)?;

    if session.completed {
        return Err(AppError::Forbidden); // Already completed
    }

    // 1. Append User Message
    let user_entry = TranscriptEntry {
        role: "user".to_string(),
        content: payload.message.clone(),
        timestamp: Some(Utc::now()),
    };
    session.transcript.push(user_entry.clone());

    // 2. [TODO: AI ENGINE INTEGRATION]
    // Here we would construct the prompt using:
    // - The scenario's prompt_template
    // - The chat history (session.transcript)
    // - Call OpenAI using reqwest to get the interviewer's reply.
    
    // For now, we mock the AI response:
    let ai_reply_text = "That is a great point. Can you tell me more about your experience in a high-pressure environment?".to_string();

    // 3. Append AI Message
    let ai_entry = TranscriptEntry {
        role: "interviewer".to_string(),
        content: ai_reply_text.clone(),
        timestamp: Some(Utc::now()),
    };
    session.transcript.push(ai_entry.clone());
    session.updated_at = Utc::now();

    // 4. Save back to DB
    session_coll.update_one(
        doc! { "_id": sess_id },
        doc! { 
            "$set": { 
                "transcript": mongodb::bson::to_bson(&session.transcript).unwrap(),
                "updated_at": mongodb::bson::DateTime::now()
            } 
        }
    ).await?;

    Ok(Json(ChatResponse {
        reply: ai_reply_text,
        session,
    }))
}

/// POST /api/interviews/sessions/:session_id/complete
pub async fn complete_interview_session(
    State(state): State<Arc<AppState>>,
    user: User,
    Path(session_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let sess_id = ObjectId::parse_str(&session_id).map_err(|_| AppError::NotFound)?;
    let session_coll: Collection<InterviewSession> = state.db.database("rustapi").collection("interview_sessions");

    let mut session = session_coll.find_one(doc! { "_id": sess_id, "user_id": user.id.unwrap() }).await?
        .ok_or(AppError::NotFound)?;

    if session.completed {
        return Ok(Json(session));
    }

    // [TODO: AI EVALUATION ENGINE]
    // Here we would:
    // 1. Fetch `InterviewQuestion` expected keywords for this scenario
    // 2. Call OpenAI to grade the entire `session.transcript`
    // 3. Extract score and feedback from OpenAI response
    
    // Mock Evaluation:
    let final_score = 85.0;
    let mock_feedback = "Good answers, but you could improve on your vocabulary related to guest complaints.".to_string();

    session.score = Some(final_score);
    session.feedback = Some(mock_feedback);
    session.completed = true;
    session.updated_at = Utc::now();

    session_coll.update_one(
        doc! { "_id": sess_id },
        doc! { 
            "$set": { 
                "completed": true,
                "score": final_score,
                "feedback": &session.feedback,
                "updated_at": mongodb::bson::DateTime::now()
            } 
        }
    ).await?;

    // We should also add XP to the user's progress here (like 50 XP for interview)
    // You can call `add_xp` logic directly here or via the existing endpoint from the app.

    Ok(Json(session))
}
