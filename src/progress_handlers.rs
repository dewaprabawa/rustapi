use axum::{
    extract::{State, Json},
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::progress_models::*;
use crate::models::User;
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;

// ==================== USER PROGRESS ====================

/// GET /progress — Get current user's progress
pub async fn get_progress(
    State(state): State<Arc<AppState>>,
    user: User,
) -> Result<impl IntoResponse, AppError> {
    let user_id = user.id.unwrap();
    let collection: Collection<UserProgress> = state.db.database("rustapi").collection("progress");

    let progress = collection.find_one(doc! { "user_id": user_id }).await?;

    match progress {
        Some(p) => Ok(Json(p)),
        None => {
            // Initialize progress for new user
            let new_progress = UserProgress {
                id: None,
                user_id,
                xp: 0,
                level: 1,
                streak_days: 0,
                last_activity_date: None,
                completed_lessons: vec![],
                completed_quizzes: vec![],
                interview_count: 0,
                average_interview_score: 0.0,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            collection.insert_one(new_progress.clone()).await?;
            Ok(Json(new_progress))
        }
    }
}

/// POST /progress/xp — Add XP after completing a lesson/quiz
pub async fn add_xp(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<AddXPRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = user.id.unwrap();
    let collection: Collection<UserProgress> = state.db.database("rustapi").collection("progress");

    // Ensure progress exists
    let progress = collection.find_one(doc! { "user_id": user_id }).await?;
    if progress.is_none() {
        let new_progress = UserProgress {
            id: None,
            user_id,
            xp: 0,
            level: 1,
            streak_days: 0,
            last_activity_date: None,
            completed_lessons: vec![],
            completed_quizzes: vec![],
            interview_count: 0,
            average_interview_score: 0.0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        collection.insert_one(new_progress).await?;
    }

    // Update XP
    let mut update = doc! {
        "$inc": { "xp": payload.xp },
        "$set": {
            "updated_at": mongodb::bson::DateTime::now(),
            "last_activity_date": mongodb::bson::DateTime::now()
        }
    };

    // Track completed lesson/quiz
    if let Some(ref lesson_id) = payload.lesson_id {
        if let Ok(oid) = ObjectId::parse_str(lesson_id) {
            update.insert("$addToSet", doc! { "completed_lessons": oid });
        }
    }
    if let Some(ref quiz_id) = payload.quiz_id {
        if let Ok(oid) = ObjectId::parse_str(quiz_id) {
            update.insert("$addToSet", doc! { "completed_quizzes": oid });
        }
    }

    collection.update_one(doc! { "user_id": user_id }, update).await?;

    // Recalculate level
    let updated = collection.find_one(doc! { "user_id": user_id }).await?
        .ok_or(AppError::InternalServerError)?;

    let new_level = calculate_level(updated.xp);
    let level_up = new_level > updated.level;

    if level_up {
        collection.update_one(
            doc! { "user_id": user_id },
            doc! { "$set": { "level": new_level } }
        ).await?;
    }

    Ok(Json(XPResponse {
        xp: updated.xp + payload.xp,
        level: if level_up { new_level } else { updated.level },
        level_up,
        streak_days: updated.streak_days,
    }))
}

/// POST /progress/quiz — Submit a quiz attempt
pub async fn submit_quiz(
    State(state): State<Arc<AppState>>,
    user: User,
    Json(payload): Json<SubmitQuizRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = user.id.unwrap();
    let quiz_id = ObjectId::parse_str(&payload.quiz_id).map_err(|_| AppError::NotFound)?;

    // Fetch the quiz
    let quiz_collection: Collection<crate::content_models::Quiz> = state.db.database("rustapi").collection("quizzes");
    let quiz = quiz_collection.find_one(doc! { "_id": quiz_id }).await?
        .ok_or(AppError::NotFound)?;

    // Score the quiz
    let mut correct = 0;
    let mut answers = vec![];
    for (i, &selected) in payload.answers.iter().enumerate() {
        let is_correct = quiz.questions.get(i)
            .map(|q| q.correct_answer == selected)
            .unwrap_or(false);
        if is_correct { correct += 1; }
        answers.push(QuizAnswer {
            question_index: i,
            selected_answer: selected,
            is_correct,
        });
    }

    let total = quiz.questions.len() as f64;
    let score = if total > 0.0 { (correct as f64 / total) * 100.0 } else { 0.0 };
    let passed = score >= quiz.passing_score as f64;
    let xp_earned = if passed { quiz.xp_reward as i64 } else { 0 };

    // Save attempt
    let attempt_collection: Collection<QuizAttempt> = state.db.database("rustapi").collection("quiz_attempts");
    let attempt = QuizAttempt {
        id: None,
        user_id,
        quiz_id,
        score,
        passed,
        answers,
        xp_earned,
        completed_at: Utc::now(),
    };
    attempt_collection.insert_one(attempt).await?;

    // Add XP if passed
    if passed {
        let progress_collection: Collection<UserProgress> = state.db.database("rustapi").collection("progress");
        progress_collection.update_one(
            doc! { "user_id": user_id },
            doc! {
                "$inc": { "xp": xp_earned },
                "$addToSet": { "completed_quizzes": quiz_id },
                "$set": { "updated_at": mongodb::bson::DateTime::now() }
            }
        ).await?;
    }

    Ok(Json(serde_json::json!({
        "score": score,
        "passed": passed,
        "correct": correct,
        "total": quiz.questions.len(),
        "xp_earned": xp_earned,
    })))
}

// ==================== GAMIFICATION CONFIG (Admin) ====================

/// GET /admin/gamification
pub async fn get_gamification_config(
    State(state): State<Arc<AppState>>,
    _admin: crate::models::Admin,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<GamificationConfig> = state.db.database("rustapi").collection("gamification_config");

    let config = collection.find_one(doc! {}).await?;

    match config {
        Some(c) => Ok(Json(c)),
        None => {
            let defaults = GamificationConfig {
                id: None,
                xp_per_lesson: 10,
                xp_per_quiz: 20,
                xp_per_interview: 50,
                streak_bonus_xp: 5,
                level_thresholds: vec![
                    LevelThreshold { level: 1, min_xp: 0, title: "Beginner".into(), title_id: Some("Pemula".into()) },
                    LevelThreshold { level: 2, min_xp: 100, title: "Elementary".into(), title_id: Some("Dasar".into()) },
                    LevelThreshold { level: 3, min_xp: 300, title: "Intermediate".into(), title_id: Some("Menengah".into()) },
                    LevelThreshold { level: 4, min_xp: 600, title: "Advanced".into(), title_id: Some("Mahir".into()) },
                    LevelThreshold { level: 5, min_xp: 1000, title: "Expert".into(), title_id: Some("Ahli".into()) },
                ],
                updated_at: Utc::now(),
            };
            collection.insert_one(defaults.clone()).await?;
            Ok(Json(defaults))
        }
    }
}

/// PUT /admin/gamification
pub async fn update_gamification_config(
    State(state): State<Arc<AppState>>,
    _admin: crate::models::Admin,
    Json(payload): Json<UpdateGamificationRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<GamificationConfig> = state.db.database("rustapi").collection("gamification_config");

    let mut update = doc! { "updated_at": mongodb::bson::DateTime::now() };
    if let Some(v) = payload.xp_per_lesson { update.insert("xp_per_lesson", v); }
    if let Some(v) = payload.xp_per_quiz { update.insert("xp_per_quiz", v); }
    if let Some(v) = payload.xp_per_interview { update.insert("xp_per_interview", v); }
    if let Some(v) = payload.streak_bonus_xp { update.insert("streak_bonus_xp", v); }
    if let Some(ref v) = payload.level_thresholds {
        update.insert("level_thresholds", mongodb::bson::to_bson(v).unwrap());
    }

    let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
    collection.update_one(doc! {}, doc! { "$set": update })
        .with_options(options).await?;

    let updated = collection.find_one(doc! {}).await?.ok_or(AppError::NotFound)?;
    Ok(Json(updated))
}

// ==================== HELPERS ====================

fn calculate_level(xp: i64) -> i32 {
    // Default level thresholds
    if xp >= 1000 { 5 }
    else if xp >= 600 { 4 }
    else if xp >= 300 { 3 }
    else if xp >= 100 { 2 }
    else { 1 }
}
