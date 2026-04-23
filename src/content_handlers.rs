use axum::{
    extract::{State, Json, Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::content_models::*;
use crate::models::{Admin, PaginationParams, PaginatedResponse};
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;
use mongodb::options::FindOptions;
use futures::TryStreamExt;

// ==================== COURSES ====================

/// POST /admin/courses
pub async fn create_course(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateCourseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Course> = state.db.database("rustapi").collection("courses");

    let course = Course {
        id: None,
        title: payload.title,
        title_id: payload.title_id,
        description: payload.description,
        description_id: payload.description_id,
        category: payload.category,
        level: payload.level,
        cover_image_url: payload.cover_image_url,
        is_published: false,
        order: payload.order.unwrap_or(0),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(course.clone()).await?;
    let mut created = course;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/courses
pub async fn list_courses(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Query(params): Query<PaginationParams>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Course> = state.db.database("rustapi").collection("courses");

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let skip = (page - 1) * limit as u64;
    let total = collection.count_documents(doc! {}).await? as u64;

    let options = FindOptions::builder()
        .skip(skip).limit(limit)
        .sort(doc! { "order": 1, "created_at": -1 })
        .build();

    let cursor = collection.find(doc! {}).with_options(options).await?;
    let data: Vec<Course> = cursor.try_collect().await?;

    Ok(Json(PaginatedResponse { data, page, limit, total }))
}

/// GET /admin/courses/:id
pub async fn get_course(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Course> = state.db.database("rustapi").collection("courses");
    let course = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound)?;
    Ok(Json(course))
}

/// PUT /admin/courses/:id
pub async fn update_course(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCourseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Course> = state.db.database("rustapi").collection("courses");

    let mut update = doc! { "updated_at": mongodb::bson::DateTime::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.title_id { update.insert("title_id", v); }
    if let Some(v) = payload.description { update.insert("description", v); }
    if let Some(v) = payload.description_id { update.insert("description_id", v); }
    if let Some(v) = payload.cover_image_url { update.insert("cover_image_url", v); }
    if let Some(v) = payload.is_published { update.insert("is_published", v); }
    if let Some(v) = payload.order { update.insert("order", v); }
    if let Some(ref v) = payload.category {
        update.insert("category", mongodb::bson::to_bson(v).unwrap());
    }
    if let Some(ref v) = payload.level {
        update.insert("level", mongodb::bson::to_bson(v).unwrap());
    }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound)?;
    Ok(Json(updated))
}

/// DELETE /admin/courses/:id
pub async fn delete_course(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Course> = state.db.database("rustapi").collection("courses");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound); }
    Ok(Json(serde_json::json!({ "message": "Course deleted" })))
}

// ==================== MODULES ====================

/// POST /admin/modules
pub async fn create_module(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateModuleRequest>,
) -> Result<impl IntoResponse, AppError> {
    let course_id = ObjectId::parse_str(&payload.course_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Module> = state.db.database("rustapi").collection("modules");

    let module = Module {
        id: None,
        course_id,
        title: payload.title,
        title_id: payload.title_id,
        description: payload.description,
        description_id: payload.description_id,
        order: payload.order.unwrap_or(0),
        is_published: false,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(module.clone()).await?;
    let mut created = module;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/modules?course_id=xxx
#[derive(Debug, serde::Deserialize)]
pub struct ModuleQuery {
    pub course_id: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

pub async fn list_modules(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Query(params): Query<ModuleQuery>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Module> = state.db.database("rustapi").collection("modules");

    let mut filter = doc! {};
    if let Some(cid) = &params.course_id {
        let oid = ObjectId::parse_str(cid).map_err(|_| AppError::NotFound)?;
        filter.insert("course_id", oid);
    }

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(50).min(100);
    let skip = (page - 1) * limit as u64;
    let total = collection.count_documents(filter.clone()).await? as u64;

    let options = FindOptions::builder()
        .skip(skip).limit(limit).sort(doc! { "order": 1 }).build();

    let cursor = collection.find(filter).with_options(options).await?;
    let data: Vec<Module> = cursor.try_collect().await?;

    Ok(Json(PaginatedResponse { data, page, limit, total }))
}

/// PUT /admin/modules/:id
pub async fn update_module(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateModuleRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Module> = state.db.database("rustapi").collection("modules");

    let mut update = doc! { "updated_at": mongodb::bson::DateTime::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.title_id { update.insert("title_id", v); }
    if let Some(v) = payload.description { update.insert("description", v); }
    if let Some(v) = payload.description_id { update.insert("description_id", v); }
    if let Some(v) = payload.is_published { update.insert("is_published", v); }
    if let Some(v) = payload.order { update.insert("order", v); }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound)?;
    Ok(Json(updated))
}

/// DELETE /admin/modules/:id
pub async fn delete_module(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Module> = state.db.database("rustapi").collection("modules");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound); }
    Ok(Json(serde_json::json!({ "message": "Module deleted" })))
}

// ==================== LESSONS ====================

/// POST /admin/lessons
pub async fn create_lesson(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateLessonRequest>,
) -> Result<impl IntoResponse, AppError> {
    let module_id = ObjectId::parse_str(&payload.module_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Lesson> = state.db.database("rustapi").collection("lessons");

    let lesson = Lesson {
        id: None,
        module_id,
        title: payload.title,
        title_id: payload.title_id,
        content: payload.content,
        content_id: payload.content_id,
        audio_url: payload.audio_url,
        level: payload.level,
        category: payload.category,
        xp_reward: payload.xp_reward.unwrap_or(10),
        order: payload.order.unwrap_or(0),
        is_published: false,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(lesson.clone()).await?;
    let mut created = lesson;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/lessons?module_id=xxx
#[derive(Debug, serde::Deserialize)]
pub struct LessonQuery {
    pub module_id: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<i64>,
}

pub async fn list_lessons(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Query(params): Query<LessonQuery>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Lesson> = state.db.database("rustapi").collection("lessons");

    let mut filter = doc! {};
    if let Some(mid) = &params.module_id {
        let oid = ObjectId::parse_str(mid).map_err(|_| AppError::NotFound)?;
        filter.insert("module_id", oid);
    }

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(50).min(100);
    let skip = (page - 1) * limit as u64;
    let total = collection.count_documents(filter.clone()).await? as u64;

    let options = FindOptions::builder()
        .skip(skip).limit(limit).sort(doc! { "order": 1 }).build();

    let cursor = collection.find(filter).with_options(options).await?;
    let data: Vec<Lesson> = cursor.try_collect().await?;

    Ok(Json(PaginatedResponse { data, page, limit, total }))
}

/// PUT /admin/lessons/:id
pub async fn update_lesson(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateLessonRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Lesson> = state.db.database("rustapi").collection("lessons");

    let mut update = doc! { "updated_at": mongodb::bson::DateTime::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.title_id { update.insert("title_id", v); }
    if let Some(v) = payload.content { update.insert("content", v); }
    if let Some(v) = payload.content_id { update.insert("content_id", v); }
    if let Some(v) = payload.audio_url { update.insert("audio_url", v); }
    if let Some(v) = payload.xp_reward { update.insert("xp_reward", v); }
    if let Some(v) = payload.is_published { update.insert("is_published", v); }
    if let Some(v) = payload.order { update.insert("order", v); }
    if let Some(ref v) = payload.level {
        update.insert("level", mongodb::bson::to_bson(v).unwrap());
    }
    if let Some(ref v) = payload.category {
        update.insert("category", mongodb::bson::to_bson(v).unwrap());
    }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound)?;
    Ok(Json(updated))
}

/// DELETE /admin/lessons/:id
pub async fn delete_lesson(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Lesson> = state.db.database("rustapi").collection("lessons");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound); }
    Ok(Json(serde_json::json!({ "message": "Lesson deleted" })))
}

// ==================== VOCABULARY ====================

/// POST /admin/vocabulary
pub async fn create_vocabulary(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateVocabularyRequest>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&payload.lesson_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Vocabulary> = state.db.database("rustapi").collection("vocabulary");

    let vocab = Vocabulary {
        id: None,
        lesson_id,
        word: payload.word,
        translation: payload.translation,
        pronunciation: payload.pronunciation,
        audio_url: payload.audio_url,
        example_en: payload.example_en,
        example_id: payload.example_id,
        created_at: Utc::now(),
    };

    let result = collection.insert_one(vocab.clone()).await?;
    let mut created = vocab;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/vocabulary?lesson_id=xxx
#[derive(Debug, serde::Deserialize)]
pub struct VocabQuery {
    pub lesson_id: String,
}

pub async fn list_vocabulary(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Query(params): Query<VocabQuery>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&params.lesson_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Vocabulary> = state.db.database("rustapi").collection("vocabulary");

    let cursor = collection.find(doc! { "lesson_id": lesson_id }).await?;
    let data: Vec<Vocabulary> = cursor.try_collect().await?;

    Ok(Json(data))
}

// ==================== DIALOGUES ====================

/// POST /admin/dialogues
pub async fn create_dialogue(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateDialogueRequest>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&payload.lesson_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Dialogue> = state.db.database("rustapi").collection("dialogues");

    let dialogue = Dialogue {
        id: None,
        lesson_id,
        title: payload.title,
        context: payload.context,
        lines: payload.lines,
        created_at: Utc::now(),
    };

    let result = collection.insert_one(dialogue.clone()).await?;
    let mut created = dialogue;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/dialogues?lesson_id=xxx
pub async fn list_dialogues(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Query(params): Query<VocabQuery>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&params.lesson_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Dialogue> = state.db.database("rustapi").collection("dialogues");

    let cursor = collection.find(doc! { "lesson_id": lesson_id }).await?;
    let data: Vec<Dialogue> = cursor.try_collect().await?;

    Ok(Json(data))
}

// ==================== QUIZZES ====================

/// POST /admin/quizzes
pub async fn create_quiz(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateQuizRequest>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&payload.lesson_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Quiz> = state.db.database("rustapi").collection("quizzes");

    let quiz = Quiz {
        id: None,
        lesson_id,
        title: payload.title,
        passing_score: payload.passing_score.unwrap_or(70),
        xp_reward: payload.xp_reward.unwrap_or(20),
        questions: payload.questions,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(quiz.clone()).await?;
    let mut created = quiz;
    created.id = result.inserted_id.as_object_id();

    Ok((StatusCode::CREATED, Json(created)))
}

/// GET /admin/quizzes?lesson_id=xxx
pub async fn list_quizzes(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Query(params): Query<VocabQuery>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&params.lesson_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Quiz> = state.db.database("rustapi").collection("quizzes");

    let cursor = collection.find(doc! { "lesson_id": lesson_id }).await?;
    let data: Vec<Quiz> = cursor.try_collect().await?;

    Ok(Json(data))
}

// ==================== PUBLIC CONTENT ENDPOINTS (for mobile app) ====================

/// GET /courses — Public, published courses only
pub async fn public_list_courses(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Course> = state.db.database("rustapi").collection("courses");

    let cursor = collection.find(doc! { "is_published": true })
        .sort(doc! { "order": 1 })
        .await?;
    let data: Vec<Course> = cursor.try_collect().await?;

    Ok(Json(data))
}

/// GET /courses/:id/modules — Public modules for a course
pub async fn public_list_modules(
    State(state): State<Arc<AppState>>,
    Path(course_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&course_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Module> = state.db.database("rustapi").collection("modules");

    let cursor = collection.find(doc! { "course_id": oid, "is_published": true })
        .sort(doc! { "order": 1 })
        .await?;
    let data: Vec<Module> = cursor.try_collect().await?;

    Ok(Json(data))
}

/// GET /modules/:id/lessons — Public lessons for a module
pub async fn public_list_lessons(
    State(state): State<Arc<AppState>>,
    Path(module_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&module_id).map_err(|_| AppError::NotFound)?;
    let collection: Collection<Lesson> = state.db.database("rustapi").collection("lessons");

    let cursor = collection.find(doc! { "module_id": oid, "is_published": true })
        .sort(doc! { "order": 1 })
        .await?;
    let data: Vec<Lesson> = cursor.try_collect().await?;

    Ok(Json(data))
}

/// GET /lessons/:id — Full lesson with vocabulary, dialogues, quiz
pub async fn public_get_lesson(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound)?;

    let lesson: Lesson = state.db.database("rustapi").collection::<Lesson>("lessons")
        .find_one(doc! { "_id": oid, "is_published": true }).await?
        .ok_or(AppError::NotFound)?;

    let vocab: Vec<Vocabulary> = state.db.database("rustapi").collection::<Vocabulary>("vocabulary")
        .find(doc! { "lesson_id": oid }).await?
        .try_collect().await?;

    let dialogues: Vec<Dialogue> = state.db.database("rustapi").collection::<Dialogue>("dialogues")
        .find(doc! { "lesson_id": oid }).await?
        .try_collect().await?;

    let quizzes: Vec<Quiz> = state.db.database("rustapi").collection::<Quiz>("quizzes")
        .find(doc! { "lesson_id": oid }).await?
        .try_collect().await?;

    Ok(Json(serde_json::json!({
        "lesson": lesson,
        "vocabulary": vocab,
        "dialogues": dialogues,
        "quizzes": quizzes,
    })))
}
