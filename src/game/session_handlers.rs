use axum::{
    extract::{State, Json},
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::game::models::*;
use crate::models::User;
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;

/// POST /api/games/session/start
pub async fn start_session(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<StartSessionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let game_id = ObjectId::parse_str(&payload.game_id).map_err(|_| AppError::NotFound)?;
    let user_id = user.id.unwrap();

    let collection: Collection<GameSession> = state.db.database("rustapi").collection("game_sessions");

    // Close any active sessions for this game
    collection.update_many(
        doc! { "user_id": user_id, "game_id": game_id, "status": "active" },
        doc! { "$set": { "status": "failed", "updated_at": mongodb::bson::DateTime::now() } }
    ).await?;

    let session = GameSession {
        id: None,
        user_id,
        game_id,
        status: "active".to_string(),
        lives: 3,
        current_xp: 0,
        started_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(session.clone()).await?;
    let mut created = session;
    created.id = result.inserted_id.as_object_id();

    eprintln!("DEBUG: Created new session {} for game {} (user: {})", 
        created.id.unwrap(), game_id, user_id);

    Ok(Json(created))
}

/// POST /api/games/session/answer
pub async fn submit_answer(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<AnswerSubmitRequest>,
) -> Result<impl IntoResponse, AppError> {
    let session_id = ObjectId::parse_str(&payload.session_id).map_err(|_| AppError::NotFound)?;
    let user_id = user.id.unwrap();

    let session_coll: Collection<GameSession> = state.db.database("rustapi").collection("game_sessions");
    
    let mut session = session_coll.find_one(doc! { "_id": session_id, "user_id": user_id }).await?
        .ok_or(AppError::NotFound)?;

    if session.status != "active" {
        eprintln!("DEBUG: Session {} is not active. Status: {}", session_id, session.status);
        return Err(AppError::Forbidden); // Game over or completed
    }

    let game_coll: Collection<GameContent> = state.db.database("rustapi").collection("games");
    let game = game_coll.find_one(doc! { "_id": session.game_id }).await?
        .ok_or(AppError::NotFound)?;

    // Basic logic for SceneMatcher: Validate if payload.answer == game.data_json["correct"]
    let is_correct = match game.game_type {
        GameType::SceneMatcher | GameType::RespectMaster | GameType::FillInTheBlank => {
            if let Some(correct) = game.data_json.get("correct") {
                &payload.answer == correct
            } else {
                true
            }
        },
        GameType::WordScramble => {
            if let Some(word) = game.data_json.get("word") {
                // Ignore case for word scramble
                let guess = payload.answer.as_str().unwrap_or("").to_lowercase();
                let correct = word.as_str().unwrap_or("").to_lowercase();
                guess == correct
            } else {
                true
            }
        },
        GameType::Matching => {
            // For matching, the client sends the completed pairs.
            // We'll trust the client for now but check if they matched everything.
            if let (Some(pairs), Some(answer)) = (game.data_json.get("pairs"), payload.answer.as_array()) {
                if let Some(expected_pairs) = pairs.as_array() {
                    answer.len() == expected_pairs.len()
                } else {
                    true
                }
            } else {
                true
            }
        },
        _ => true, // Other games like VoiceStar have custom logic elsewhere
    };

    let xp_earned = if is_correct { game.xp_reward } else { 0 };

    if is_correct {
        session.current_xp += xp_earned;
        session.status = "completed".to_string(); // Assuming single answer game for now
    } else {
        session.lives -= 1;
        if session.lives <= 0 {
            session.status = "failed".to_string();
        }
    }

    session.updated_at = Utc::now();

    session_coll.update_one(
        doc! { "_id": session_id },
        doc! { "$set": { 
            "status": &session.status, 
            "lives": session.lives, 
            "current_xp": session.current_xp,
            "updated_at": mongodb::bson::DateTime::now()
        }}
    ).await?;

    // Add XP globally if completed
    if session.status == "completed" {
        crate::progress::handlers::add_xp(
            State(state.clone()),
            user,
            Json(crate::progress::models::AddXPRequest { 
                xp: session.current_xp, 
                lesson_id: Some(game.lesson_id.to_string()), 
                quiz_id: None 
            })
        ).await?;
    }

    Ok(Json(AnswerResultResponse {
        is_correct,
        xp_earned,
        lives_remaining: session.lives,
        status: session.status.clone(),
        feedback: if is_correct { Some("Great job!".to_string()) } else { Some("Try again!".to_string()) }
    }))
}

/// POST /api/games/session/sync
/// Processes a batch of answers submitted while the user was offline.
pub async fn sync_offline_sessions(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<OfflineSyncRequest>,
) -> Result<impl IntoResponse, AppError> {
    let _user_id = user.id.unwrap();
    let mut total_xp: i64 = 0;
    let mut synced_count = 0;

    let game_coll: Collection<GameContent> = state.db.database("rustapi").collection("games");

    for answer in payload.offline_answers {
        if let Ok(game_id) = ObjectId::parse_str(&answer.game_id) {
            if let Ok(Some(game)) = game_coll.find_one(doc! { "_id": game_id }).await {
                // If client claims they were correct, and it matches basic logic or we trust client offline auth
                if answer.is_correct {
                    total_xp += game.xp_reward;
                }
                synced_count += 1;
            }
        }
    }

    if total_xp > 0 {
        crate::progress::handlers::add_xp(
            State(state.clone()),
            user,
            Json(crate::progress::models::AddXPRequest { 
                xp: total_xp, 
                lesson_id: None, 
                quiz_id: None 
            })
        ).await?;
    }

    Ok(Json(OfflineSyncResponse {
        synced_count,
        total_xp_awarded: total_xp,
    }))
}
