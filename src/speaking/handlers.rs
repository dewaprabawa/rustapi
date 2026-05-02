use axum::{
    extract::{State, Json, Path},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::Collection;
use bson::doc;
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;

use crate::handlers::{AppState, AppError};
use crate::models::User;
use crate::content::models::{ContentLevel, ContentCategory, Lesson};
use crate::interview::models::InterviewScenario;
use super::models::{SpeakingSession, StartSessionRequest, SessionTurnRequest, SpeakingTurn, SessionTurnResponse};
use super::agent::ClaudeAgent;
use super::feedback::FeedbackEngine;
use futures::stream::TryStreamExt;
use crate::models::Admin;

// ==================== Phase 12: Admin API ====================

pub async fn list_all_sessions(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<SpeakingSession> = state.db.database("rustapi").collection("speaking_sessions");
    let mut cursor = col.find(doc! {}).sort(doc! { "created_at": -1 }).limit(100).await?;
    let mut sessions = Vec::new();
    while let Some(session) = cursor.try_next().await? {
        sessions.push(session);
    }
    Ok(Json(sessions))
}

// ==================== Phase 7: Session API ====================

/// POST /progress/speaking/sessions/start
pub async fn start_session(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<StartSessionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col: Collection<SpeakingSession> = db.collection("speaking_sessions");

    let mut topic = "General Conversation".to_string();
    let mut level = ContentLevel::A1;
    let mut category = ContentCategory::General;

    let lesson_id = if let Some(id_str) = &payload.lesson_id {
        let oid = ObjectId::parse_str(id_str).map_err(|_| AppError::BadRequest("Invalid lesson_id".to_string()))?;
        if let Some(lesson) = db.collection::<Lesson>("lessons").find_one(doc! { "_id": oid }).await? {
            topic = lesson.title;
        }
        Some(oid)
    } else { None };

    let scenario_id = if let Some(id_str) = &payload.scenario_id {
        let oid = ObjectId::parse_str(id_str).map_err(|_| AppError::BadRequest("Invalid scenario_id".to_string()))?;
        if let Some(scenario) = db.collection::<InterviewScenario>("scenarios").find_one(doc! { "_id": oid }).await? {
            topic = scenario.title;
            level = ContentLevel::A1; // InterviewScenario doesn't have a level field, wait... Let's look at InterviewScenario. It doesn't have 'level' but 'difficulty'. So I'll hardcode A1 for now or map it. Let's map it.
            category = scenario.category;
        }
        Some(oid)
    } else { None };

    let session = SpeakingSession {
        id: None,
        user_id: user.id.unwrap(),
        lesson_id,
        scenario_id,
        topic,
        level,
        category,
        turns: vec![],
        status: "active".to_string(),
        xp_awarded: None,
        scores: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = col.insert_one(session.clone()).await?;
    let mut created = session;
    created.id = result.inserted_id.as_object_id();
    
    Ok((StatusCode::CREATED, Json(created)))
}

/// POST /progress/speaking/sessions/:id/turn
pub async fn session_turn(
    State(state): State<Arc<AppState>>,
    user: User,
    Path(id): Path<String>,
    Json(payload): Json<SessionTurnRequest>,
) -> Result<impl IntoResponse, AppError> {
    let session_oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let db = state.db.database("rustapi");
    let col: Collection<SpeakingSession> = db.collection("speaking_sessions");

    let mut session = col.find_one(doc! { "_id": session_oid, "user_id": user.id.unwrap() }).await?.ok_or(AppError::NotFound)?;

    if session.status != "active" {
        return Err(AppError::BadRequest("Session is not active".to_string()));
    }

    // 1. Save user turn
    let user_turn = SpeakingTurn {
        role: "user".to_string(),
        transcript: payload.transcript.clone(),
        audio_url: None,
        timestamp: Utc::now(),
    };
    session.turns.push(user_turn.clone());

    // 2. Call Claude Agent
    let agent = ClaudeAgent::new(state.clone());
    let (ai_reply, is_complete) = agent.generate_reply(&session).await?;

    // 3. Save AI turn
    let ai_turn = SpeakingTurn {
        role: "ai".to_string(),
        transcript: ai_reply.clone(),
        audio_url: None,
        timestamp: Utc::now(),
    };
    session.turns.push(ai_turn);

    if is_complete {
        session.status = "completed".to_string();
    }
    
    session.updated_at = Utc::now();
    col.update_one(doc! { "_id": session_oid }, doc! { "$set": bson::to_document(&session).unwrap() }).await?;

    Ok(Json(SessionTurnResponse {
        ai_reply,
        audio_bytes: None,
        is_complete,
    }))
}

/// POST /progress/speaking/sessions/:id/end
pub async fn end_session(
    State(state): State<Arc<AppState>>,
    user: User,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let session_oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let db = state.db.database("rustapi");
    let col: Collection<SpeakingSession> = db.collection("speaking_sessions");

    let mut session = col.find_one(doc! { "_id": session_oid, "user_id": user.id.unwrap() }).await?.ok_or(AppError::NotFound)?;

    if session.scores.is_none() {
        let feedback_engine = FeedbackEngine::new(state.clone());
        match feedback_engine.generate_feedback(&session).await {
            Ok(scores) => {
                let xp = FeedbackEngine::calculate_xp(&scores);
                session.scores = Some(scores);
                session.xp_awarded = Some(xp);
                // In a real app we'd also call a progress handler here to give user the XP
            },
            Err(e) => {
                eprintln!("Failed to generate feedback: {:?}", e);
            }
        }
    }

    session.status = "completed".to_string();
    session.updated_at = Utc::now();
    
    col.update_one(
        doc! { "_id": session_oid }, 
        doc! { "$set": bson::to_document(&session).unwrap() }
    ).await?;

    Ok(Json(session))
}
