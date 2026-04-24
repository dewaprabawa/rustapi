use axum::{
    extract::{State, Json, Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::interview::models::*;
use crate::models::{Admin, PaginationParams, PaginatedResponse};
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;
use mongodb::options::FindOptions;
use futures::TryStreamExt;

// ==================== SCENARIOS ====================

/// POST /admin/scenarios
pub async fn create_scenario(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateScenarioRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<InterviewScenario> = state.db.database("rustapi").collection("interview_scenarios");

    let scenario = InterviewScenario {
        id: None,
        title: payload.title,
        description: payload.description,
        role: payload.role,
        tone: payload.tone,
        difficulty: payload.difficulty,
        category: payload.category,
        prompt_template: payload.prompt_template,
        max_questions: payload.max_questions.unwrap_or(5),
        time_limit_minutes: payload.time_limit_minutes,
        is_active: true,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(scenario.clone()).await?;
    let mut created = scenario;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/scenarios
pub async fn list_scenarios(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Query(params): Query<PaginationParams>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<InterviewScenario> = state.db.database("rustapi").collection("interview_scenarios");

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let skip = (page - 1) * limit as u64;
    let total = collection.count_documents(doc! {}).await? as u64;

    let options = FindOptions::builder()
        .skip(skip).limit(limit)
        .sort(doc! { "created_at": -1 })
        .build();

    let cursor = collection.find(doc! {}).with_options(options).await?;
    let data: Vec<InterviewScenario> = cursor.try_collect().await?;

    Ok(Json(PaginatedResponse { data, page, limit, total }))
}

/// GET /admin/scenarios/:id
pub async fn get_scenario(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<InterviewScenario> = state.db.database("rustapi").collection("interview_scenarios");
    let scenario = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound)?;

    // Also fetch associated questions
    let q_collection: Collection<InterviewQuestion> = state.db.database("rustapi").collection("interview_questions");
    let cursor = q_collection.find(doc! { "scenario_id": oid }).sort(doc! { "order": 1 }).await?;
    let questions: Vec<InterviewQuestion> = cursor.try_collect().await?;

    Ok(Json(serde_json::json!({
        "scenario": scenario,
        "questions": questions,
    })))
}

/// PUT /admin/scenarios/:id
pub async fn update_scenario(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateScenarioRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<InterviewScenario> = state.db.database("rustapi").collection("interview_scenarios");

    let mut update = doc! { "updated_at": mongodb::bson::DateTime::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.description { update.insert("description", v); }
    if let Some(v) = payload.role { update.insert("role", v); }
    if let Some(v) = payload.tone { update.insert("tone", v); }
    if let Some(v) = payload.difficulty { update.insert("difficulty", v); }
    if let Some(v) = payload.prompt_template { update.insert("prompt_template", v); }
    if let Some(v) = payload.max_questions { update.insert("max_questions", v); }
    if let Some(v) = payload.time_limit_minutes { update.insert("time_limit_minutes", v); }
    if let Some(v) = payload.is_active { update.insert("is_active", v); }
    if let Some(ref v) = payload.category {
        update.insert("category", mongodb::bson::to_bson(v).unwrap());
    }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound)?;
    Ok(Json(updated))
}

/// DELETE /admin/scenarios/:id
pub async fn delete_scenario(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;

    // Delete scenario and its questions
    state.db.database("rustapi").collection::<InterviewQuestion>("interview_questions")
        .delete_many(doc! { "scenario_id": oid }).await?;

    let collection: Collection<InterviewScenario> = state.db.database("rustapi").collection("interview_scenarios");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound); }

    Ok(Json(serde_json::json!({ "message": "Scenario and questions deleted" })))
}

// ==================== INTERVIEW QUESTIONS ====================

/// POST /admin/scenarios/:id/questions
pub async fn add_question(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateQuestionRequest>,
) -> Result<impl IntoResponse, AppError> {
    let scenario_id = ObjectId::parse_str(&payload.scenario_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<InterviewQuestion> = state.db.database("rustapi").collection("interview_questions");

    let question = InterviewQuestion {
        id: None,
        scenario_id,
        question: payload.question,
        expected_keywords: payload.expected_keywords,
        example_answer: payload.example_answer,
        order: payload.order.unwrap_or(0),
        created_at: Utc::now(),
    };

    let result = collection.insert_one(question.clone()).await?;
    let mut created = question;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// DELETE /admin/questions/:id
pub async fn delete_question(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<InterviewQuestion> = state.db.database("rustapi").collection("interview_questions");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound); }
    Ok(Json(serde_json::json!({ "message": "Question deleted" })))
}

// ==================== AI CONFIG ====================

/// GET /admin/ai-config
pub async fn list_ai_configs(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<AIConfig> = state.db.database("rustapi").collection("ai_config");
    let cursor = collection.find(doc! {}).await?;
    let data: Vec<AIConfig> = cursor.try_collect().await?;
    Ok(Json(data))
}

/// PUT /admin/ai-config/:key
pub async fn update_ai_config(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(key): Path<String>,
    Json(payload): Json<UpdateAIConfigRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<AIConfig> = state.db.database("rustapi").collection("ai_config");

    let mut update = doc! { "updated_at": mongodb::bson::DateTime::now() };
    if let Some(v) = payload.value { update.insert("value", v); }
    if let Some(v) = payload.description { update.insert("description", v); }
    if let Some(v) = payload.is_active { update.insert("is_active", v); }

    // Upsert — create if not exists
    let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
    collection.update_one(doc! { "config_key": &key }, doc! { "$set": update })
        .with_options(options)
        .await?;

    let updated = collection.find_one(doc! { "config_key": &key }).await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(updated))
}

// ==================== EVALUATION WEIGHTS ====================

/// GET /admin/evaluation-weights
pub async fn get_evaluation_weights(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<EvaluationWeights> = state.db.database("rustapi").collection("evaluation_weights");

    let weights = collection.find_one(doc! {}).await?;

    match weights {
        Some(w) => Ok(Json(w)),
        None => {
            // Return defaults
            let defaults = EvaluationWeights {
                id: None,
                pronunciation_weight: 0.3,
                grammar_weight: 0.3,
                fluency_weight: 0.25,
                vocabulary_weight: 0.15,
                updated_at: Utc::now(),
            };
            collection.insert_one(defaults.clone()).await?;
            Ok(Json(defaults))
        }
    }
}

/// PUT /admin/evaluation-weights
pub async fn update_evaluation_weights(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<UpdateWeightsRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<EvaluationWeights> = state.db.database("rustapi").collection("evaluation_weights");

    let mut update = doc! { "updated_at": mongodb::bson::DateTime::now() };
    if let Some(v) = payload.pronunciation_weight { update.insert("pronunciation_weight", v); }
    if let Some(v) = payload.grammar_weight { update.insert("grammar_weight", v); }
    if let Some(v) = payload.fluency_weight { update.insert("fluency_weight", v); }
    if let Some(v) = payload.vocabulary_weight { update.insert("vocabulary_weight", v); }

    let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
    collection.update_one(doc! {}, doc! { "$set": update })
        .with_options(options)
        .await?;

    let updated = collection.find_one(doc! {}).await?.ok_or(AppError::NotFound)?;
    Ok(Json(updated))
}

// ==================== PUBLIC ENDPOINTS (for mobile app) ====================

/// GET /scenarios — Active interview scenarios for the app
pub async fn public_list_scenarios(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<InterviewScenario> = state.db.database("rustapi").collection("interview_scenarios");

    let cursor = collection.find(doc! { "is_active": true })
        .sort(doc! { "difficulty": 1 })
        .await?;
    let data: Vec<InterviewScenario> = cursor.try_collect().await?;

    Ok(Json(data))
}

/// GET /scenarios/:id — Scenario with questions for the app
pub async fn public_get_scenario(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;

    let scenario: InterviewScenario = state.db.database("rustapi")
        .collection::<InterviewScenario>("interview_scenarios")
        .find_one(doc! { "_id": oid, "is_active": true }).await?
        .ok_or(AppError::NotFound)?;

    let cursor = state.db.database("rustapi")
        .collection::<InterviewQuestion>("interview_questions")
        .find(doc! { "scenario_id": oid }).sort(doc! { "order": 1 }).await?;
    let questions: Vec<InterviewQuestion> = cursor.try_collect().await?;

    Ok(Json(serde_json::json!({
        "scenario": scenario,
        "questions": questions,
    })))
}
