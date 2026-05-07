use axum::{
    extract::{State, Json, Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{Collection, bson::doc};
use crate::content::models::*;
use crate::interview::models::InterviewScenario;
use crate::models::{Admin, PaginationParams, PaginatedResponse, User};
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::Utc;
use mongodb::options::{FindOptions, FindOneOptions};
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
        status: CourseStatus::Draft,
        skill_focus: payload.skill_focus.unwrap_or_default(),
        target_age: payload.target_age.unwrap_or(TargetAge::All),
        estimated_duration: payload.estimated_duration.unwrap_or_else(|| "4 weeks".to_string()),
        is_paid: payload.is_paid.unwrap_or(false),
        enrollment_cap: payload.enrollment_cap,
        visibility: payload.visibility.unwrap_or(Visibility::Public),
        cover_image_url: payload.cover_image_url,
        source: None,
        is_published: false,
        order: payload.order.unwrap_or(0),
        tags: payload.tags.unwrap_or_default().into(),
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
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Course> = state.db.database("rustapi").collection("courses");
    let course = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(course))
}

/// PUT /admin/courses/:id
pub async fn update_course(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCourseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Course> = state.db.database("rustapi").collection("courses");

    // Snapshot before edit
    if let Ok(Some(old_doc)) = collection.find_one(doc! { "_id": oid }).await {
        if let Ok(old_bson) = mongodb::bson::to_document(&old_doc) {
            let _ = save_content_version(&state, "course", oid, _admin.email.clone(), old_bson, Some("Auto-saved before edit".to_string())).await;
        }
    }

    let mut update = doc! { "updated_at": bson::DateTime::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.title_id { update.insert("title_id", v); }
    if let Some(v) = payload.description { update.insert("description", v); }
    if let Some(v) = payload.description_id { update.insert("description_id", v); }
    if let Some(v) = payload.cover_image_url { update.insert("cover_image_url", v); }
    if let Some(v) = payload.is_published { update.insert("is_published", v); }
    if let Some(v) = payload.order { update.insert("order", v); }
    if let Some(ref v) = payload.status { update.insert("status", mongodb::bson::to_bson(v).unwrap()); }
    if let Some(ref v) = payload.skill_focus { update.insert("skill_focus", mongodb::bson::to_bson(v).unwrap()); }
    if let Some(ref v) = payload.target_age { update.insert("target_age", mongodb::bson::to_bson(v).unwrap()); }
    if let Some(ref v) = payload.estimated_duration { update.insert("estimated_duration", v); }
    if let Some(v) = payload.is_paid { update.insert("is_paid", v); }
    if let Some(v) = payload.enrollment_cap { update.insert("enrollment_cap", v); }
    if let Some(ref v) = payload.visibility { update.insert("visibility", mongodb::bson::to_bson(v).unwrap()); }
    if let Some(ref v) = payload.category {
        update.insert("category", mongodb::bson::to_bson(v).unwrap());
    }
    if let Some(ref v) = payload.level {
        update.insert("level", mongodb::bson::to_bson(v).unwrap());
    }
    if let Some(ref v) = payload.tags {
        update.insert("tags", mongodb::bson::to_bson(v).unwrap());
    }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(updated))
}

/// DELETE /admin/courses/:id
pub async fn delete_course(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Course> = state.db.database("rustapi").collection("courses");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }
    Ok(Json(serde_json::json!({ "message": "Course deleted" })))
}

// ==================== MODULES ====================

/// POST /admin/modules
pub async fn create_module(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateModuleRequest>,
) -> Result<impl IntoResponse, AppError> {
    let course_id = ObjectId::parse_str(&payload.course_id).map_err(|_| AppError::BadRequest("Invalid course_id".to_string()))?;
    let collection: Collection<Module> = state.db.database("rustapi").collection("modules");

    let prerequisite_oid = payload.prerequisite_id
        .and_then(|id| ObjectId::parse_str(&id).ok());

    let module = Module {
        id: None,
        course_id,
        title: payload.title,
        title_id: payload.title_id,
        description: payload.description,
        description_id: payload.description_id,
        prerequisite_id: prerequisite_oid,
        passing_score_threshold: payload.passing_score_threshold,
        skill_tags: payload.skill_tags.unwrap_or_default(),
        order: payload.order.unwrap_or(0),
        is_published: false,
        is_optional: payload.is_optional.unwrap_or(false),
        tags: payload.tags,
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
        let oid = ObjectId::parse_str(cid).map_err(|_| AppError::NotFound("Not found".to_string()))?;
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
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Module> = state.db.database("rustapi").collection("modules");

    // Snapshot before edit
    if let Ok(Some(old_doc)) = collection.find_one(doc! { "_id": oid }).await {
        if let Ok(old_bson) = mongodb::bson::to_document(&old_doc) {
            let _ = save_content_version(&state, "module", oid, _admin.email.clone(), old_bson, Some("Auto-saved before edit".to_string())).await;
        }
    }

    let mut update = doc! { "updated_at": bson::DateTime::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.title_id { update.insert("title_id", v); }
    if let Some(v) = payload.description { update.insert("description", v); }
    if let Some(v) = payload.description_id { update.insert("description_id", v); }
    if let Some(v) = payload.is_published { update.insert("is_published", v); }
    if let Some(v) = payload.order { update.insert("order", v); }
    if let Some(v) = payload.is_optional { update.insert("is_optional", v); }
    if let Some(v) = payload.passing_score_threshold { update.insert("passing_score_threshold", v); }
    if let Some(ref v) = payload.skill_tags { update.insert("skill_tags", mongodb::bson::to_bson(v).unwrap()); }
    if let Some(ref v) = payload.tags { update.insert("tags", mongodb::bson::to_bson(v).unwrap()); }
    
    if let Some(id_str) = payload.prerequisite_id {
        let p_oid = ObjectId::parse_str(&id_str).ok();
        update.insert("prerequisite_id", mongodb::bson::to_bson(&p_oid).unwrap());
    }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(updated))
}

/// DELETE /admin/modules/:id
pub async fn delete_module(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Module> = state.db.database("rustapi").collection("modules");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }
    Ok(Json(serde_json::json!({ "message": "Module deleted" })))
}

// ==================== LESSONS ====================

/// POST /admin/lessons
pub async fn create_lesson(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateLessonRequest>,
) -> Result<impl IntoResponse, AppError> {
    let module_oid = ObjectId::parse_str(&payload.module_id).map_err(|_| AppError::BadRequest("Invalid module_id".to_string()))?;
    let collection: Collection<Lesson> = state.db.database("rustapi").collection("lessons");

    let lesson = Lesson {
        id: None,
        module_id: module_oid,
        title: payload.title,
        title_id: payload.title_id,
        content: payload.content,
        content_id: payload.content_id,
        instruction: payload.instruction,
        instruction_id: payload.instruction_id,
        culture_notes: payload.culture_notes,
        audio_url: payload.audio_url,
        level: payload.level,
        category: payload.category,
        xp_reward: payload.xp_reward.unwrap_or(10),
        order: payload.order.unwrap_or(0),
        is_published: false,
        tags: payload.tags,
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
        let oid = ObjectId::parse_str(mid).map_err(|_| AppError::NotFound("Not found".to_string()))?;
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
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Lesson> = state.db.database("rustapi").collection("lessons");

    // Snapshot before edit
    if let Ok(Some(old_doc)) = collection.find_one(doc! { "_id": oid }).await {
        if let Ok(old_bson) = mongodb::bson::to_document(&old_doc) {
            let _ = save_content_version(&state, "lesson", oid, _admin.email.clone(), old_bson, Some("Auto-saved before edit".to_string())).await;
        }
    }

    let mut update = doc! { "updated_at": bson::DateTime::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.title_id { update.insert("title_id", v); }
    if let Some(v) = payload.content { update.insert("content", v); }
    if let Some(v) = payload.content_id { update.insert("content_id", v); }
    if let Some(v) = payload.instruction { update.insert("instruction", v); }
    if let Some(v) = payload.instruction_id { update.insert("instruction_id", v); }
    if let Some(v) = payload.culture_notes { update.insert("culture_notes", v); }
    if let Some(v) = payload.audio_url { update.insert("audio_url", v); }
    if let Some(v) = payload.xp_reward { update.insert("xp_reward", v); }
    if let Some(v) = payload.is_published { update.insert("is_published", v); }
    if let Some(v) = payload.order { update.insert("order", v); }
    if let Some(ref v) = payload.level { update.insert("level", mongodb::bson::to_bson(v).unwrap()); }
    if let Some(ref v) = payload.category { update.insert("category", mongodb::bson::to_bson(v).unwrap()); }
    if let Some(ref v) = payload.tags { update.insert("tags", mongodb::bson::to_bson(v).unwrap()); }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(updated))
}

/// DELETE /admin/lessons/:id
pub async fn delete_lesson(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Lesson> = state.db.database("rustapi").collection("lessons");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }
    Ok(Json(serde_json::json!({ "message": "Lesson deleted" })))
}

// ==================== VOCABULARY ====================

/// POST /admin/vocabulary
pub async fn create_vocabulary(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateVocabularyRequest>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&payload.lesson_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
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
    let lesson_id = ObjectId::parse_str(&params.lesson_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Vocabulary> = state.db.database("rustapi").collection("vocabulary");

    let cursor = collection.find(doc! { "lesson_id": lesson_id }).await?;
    let data: Vec<Vocabulary> = cursor.try_collect().await?;

    Ok(Json(data))
}

// ==================== DIALOGUES ====================

/// GET /admin/vocabulary/:id
pub async fn get_vocabulary(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Vocabulary> = state.db.database("rustapi").collection("vocabulary");
    let vocab = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(vocab))
}

/// PUT /admin/vocabulary/:id
pub async fn update_vocabulary(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateVocabularyRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Vocabulary> = state.db.database("rustapi").collection("vocabulary");

    let mut update = doc! {};
    if let Some(v) = payload.word { update.insert("word", v); }
    if let Some(v) = payload.translation { update.insert("translation", v); }
    if let Some(v) = payload.pronunciation { update.insert("pronunciation", v); }
    if let Some(v) = payload.audio_url { update.insert("audio_url", v); }
    if let Some(v) = payload.example_en { update.insert("example_en", v); }
    if let Some(v) = payload.example_id { update.insert("example_id", v); }

    if update.is_empty() { return Ok(Json(serde_json::json!({ "message": "No changes" }))); }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(serde_json::to_value(updated).map_err(|_| AppError::InternalServerError)?))
}

/// DELETE /admin/vocabulary/:id
pub async fn delete_vocabulary(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Vocabulary> = state.db.database("rustapi").collection("vocabulary");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }
    Ok(Json(serde_json::json!({ "message": "Vocabulary deleted" })))
}

// ==================== DIALOGUES ====================

/// POST /admin/dialogues
pub async fn create_dialogue(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateDialogueRequest>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&payload.lesson_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
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
    let lesson_id = ObjectId::parse_str(&params.lesson_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Dialogue> = state.db.database("rustapi").collection("dialogues");

    let cursor = collection.find(doc! { "lesson_id": lesson_id }).await?;
    let data: Vec<Dialogue> = cursor.try_collect().await?;

    Ok(Json(data))
}

// ==================== QUIZZES ====================

/// GET /admin/dialogues/:id
pub async fn get_dialogue(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Dialogue> = state.db.database("rustapi").collection("dialogues");
    let dialogue = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(dialogue))
}

/// PUT /admin/dialogues/:id
pub async fn update_dialogue(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateDialogueRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Dialogue> = state.db.database("rustapi").collection("dialogues");

    let mut update = doc! {};
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.context { update.insert("context", v); }
    if let Some(v) = payload.lines {
        // We have to convert Vec<DialogueLine> to BSON to insert
        let bson_lines = mongodb::bson::to_bson(&v).map_err(|_| AppError::InternalServerError)?;
        update.insert("lines", bson_lines);
    }

    if update.is_empty() { return Ok(Json(serde_json::json!({ "message": "No changes" }))); }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(serde_json::to_value(updated).map_err(|_| AppError::InternalServerError)?))
}

/// DELETE /admin/dialogues/:id
pub async fn delete_dialogue(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Dialogue> = state.db.database("rustapi").collection("dialogues");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }
    Ok(Json(serde_json::json!({ "message": "Dialogue deleted" })))
}

// ==================== QUIZZES ====================

/// POST /admin/quizzes
pub async fn create_quiz(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateQuizRequest>,
) -> Result<impl IntoResponse, AppError> {
    let lesson_id = ObjectId::parse_str(&payload.lesson_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
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
    let lesson_id = ObjectId::parse_str(&params.lesson_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Quiz> = state.db.database("rustapi").collection("quizzes");

    let cursor = collection.find(doc! { "lesson_id": lesson_id }).await?;
    let data: Vec<Quiz> = cursor.try_collect().await?;

    Ok(Json(data))
}

// ==================== PUBLIC CONTENT ENDPOINTS (for mobile app) ====================

/// GET /admin/quizzes/:id
pub async fn get_quiz(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Quiz> = state.db.database("rustapi").collection("quizzes");
    let quiz = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(quiz))
}

/// PUT /admin/quizzes/:id
pub async fn update_quiz(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
    Json(payload): Json<UpdateQuizRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Quiz> = state.db.database("rustapi").collection("quizzes");

    let mut update = doc! { "updated_at": bson::DateTime::now() };
    if let Some(v) = payload.title { update.insert("title", v); }
    if let Some(v) = payload.passing_score { update.insert("passing_score", v); }
    if let Some(v) = payload.xp_reward { update.insert("xp_reward", v); }
    if let Some(v) = payload.questions {
        let bson_qs = mongodb::bson::to_bson(&v).map_err(|_| AppError::InternalServerError)?;
        update.insert("questions", bson_qs);
    }

    let result = collection.update_one(doc! { "_id": oid }, doc! { "$set": update }).await?;
    if result.matched_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }

    let updated = collection.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(serde_json::to_value(updated).map_err(|_| AppError::InternalServerError)?))
}

/// DELETE /admin/quizzes/:id
pub async fn delete_quiz(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let collection: Collection<Quiz> = state.db.database("rustapi").collection("quizzes");
    let result = collection.delete_one(doc! { "_id": oid }).await?;
    if result.deleted_count == 0 { return Err(AppError::NotFound("Not found".to_string())); }
    Ok(Json(serde_json::json!({ "message": "Quiz deleted" })))
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
    let oid = ObjectId::parse_str(&course_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
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
    let oid = ObjectId::parse_str(&module_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
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
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;

    let lesson: Lesson = state.db.database("rustapi").collection::<Lesson>("lessons")
        .find_one(doc! { "_id": oid, "is_published": true }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))?;

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

/// GET /api/recommendations — Get personalized courses and scenarios for the user based on their onboarding persona
pub async fn public_recommendations(
    State(state): State<Arc<AppState>>,
    user: User,
) -> Result<impl IntoResponse, AppError> {
    let course_collection: Collection<Course> = state.db.database("rustapi").collection("courses");
    let scenario_collection: Collection<InterviewScenario> = state.db.database("rustapi").collection("interview_scenarios");

    let mut recommended_courses = vec![];
    let mut recommended_scenarios = vec![];

    // Try to find an exact match for both category/goal and level
    // Note: level and category in the DB might be stored as lowercase strings matching the ContentCategory/ContentLevel enums
    // Convert the user's string persona fields to match DB
    let user_level = user.persona.level.to_lowercase();
    let user_goal = user.persona.goal.to_lowercase();

    let course_cursor = course_collection.find(doc! {
        "is_published": true,
        // Using $regex to be case insensitive, just in case
        "level": { "$regex": format!("^{}$", user_level), "$options": "i" },
        "category": { "$regex": format!("^{}$", user_goal), "$options": "i" },
    }).await?;
    
    let exact_courses: Vec<Course> = course_cursor.try_collect().await?;
    
    // If no exact courses, just grab courses matching their level
    if exact_courses.is_empty() {
        let fallback_cursor = course_collection.find(doc! {
            "is_published": true,
            "level": { "$regex": format!("^{}$", user_level), "$options": "i" },
        }).limit(5).await?;
        recommended_courses = fallback_cursor.try_collect().await?;
    } else {
        recommended_courses = exact_courses;
    }

    // Do the same for scenarios
    let scenario_cursor = scenario_collection.find(doc! {
        "is_active": true,
        "difficulty": { "$regex": format!("^{}$", user_level), "$options": "i" },
        "category": { "$regex": format!("^{}$", user_goal), "$options": "i" },
    }).await?;

    let exact_scenarios: Vec<InterviewScenario> = scenario_cursor.try_collect().await?;

    if exact_scenarios.is_empty() {
        let fallback_cursor = scenario_collection.find(doc! {
            "is_active": true,
            "difficulty": { "$regex": format!("^{}$", user_level), "$options": "i" },
        }).limit(5).await?;
        recommended_scenarios = fallback_cursor.try_collect().await?;
    } else {
        recommended_scenarios = exact_scenarios;
    }

    Ok(Json(serde_json::json!({
        "persona": user.persona,
        "recommended_courses": recommended_courses,
        "recommended_scenarios": recommended_scenarios,
    })))
}

// ==================== LLM API KEYS ====================

/// GET /admin/api-keys
pub async fn list_api_keys(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");
    let cursor = col.find(doc! {}).await?;
    let keys: Vec<LlmApiKey> = cursor.try_collect().await?;

    // Mask the api_key values for security
    let masked: Vec<serde_json::Value> = keys.iter().map(|k| {
        let last6 = if k.api_key.len() > 6 { &k.api_key[k.api_key.len()-6..] } else { &k.api_key };
        serde_json::json!({
            "_id": k.id.map(|id| id.to_hex()),
            "provider": k.provider,
            "name": k.name,
            "api_key_masked": format!("••••••••••••{}", last6),
            "is_active": k.is_active,
            "created_at": k.created_at.to_rfc3339(),
        })
    }).collect();

    Ok(Json(masked))
}

/// POST /admin/api-keys
pub async fn create_api_key(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<CreateLlmApiKeyRequest>,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");

    // If this is the first key, make it active automatically
    let count = col.count_documents(doc! {}).await?;

    let key = LlmApiKey {
        id: None,
        provider: payload.provider,
        name: payload.name,
        api_key: payload.api_key,
        is_active: count == 0, // first key is auto-active
        created_at: Utc::now(),
    };

    let result = col.insert_one(key).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({
        "id": result.inserted_id.as_object_id().map(|id| id.to_hex()),
        "message": "API key saved"
    }))))
}

/// PUT /admin/api-keys/:id/activate
pub async fn activate_api_key(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::InvalidCredentials)?;
    let col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");

    // Deactivate all keys first
    col.update_many(doc! {}, doc! { "$set": { "is_active": false } }).await?;
    // Activate the selected one
    col.update_one(doc! { "_id": oid }, doc! { "$set": { "is_active": true } }).await?;

    Ok(Json(serde_json::json!({ "message": "Key activated" })))
}

/// DELETE /admin/api-keys/:id
pub async fn delete_api_key(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::InvalidCredentials)?;
    let col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");
    col.delete_one(doc! { "_id": oid }).await?;
    Ok(Json(serde_json::json!({ "message": "Key deleted" })))
}

// ==================== AI TRANSLATE / GENERATE ====================

/// Helper: get the active API key from DB
async fn get_active_key(state: &Arc<AppState>) -> Result<LlmApiKey, AppError> {
    let col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");
    col.find_one(doc! { "is_active": true }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))
}

/// Helper: call Gemini API
async fn call_gemini(api_key: &str, prompt: &str) -> Result<String, AppError> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
        api_key
    );
    let client = reqwest::Client::new();
    let res = client.post(&url)
        .json(&serde_json::json!({
            "contents": [{ "parts": [{ "text": prompt }] }],
            "generationConfig": { "responseMimeType": "application/json" }
        }))
        .send()
        .await
        .map_err(|e| {
            eprintln!("Gemini API error: {:?}", e);
            AppError::InternalServerError
        })?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        eprintln!("Gemini API error {}: {}", status, body);
        
        if status == axum::http::StatusCode::TOO_MANY_REQUESTS {
            // Try to extract a specific retry message from the JSON body
            let error_json: serde_json::Value = serde_json::from_str(&body).unwrap_or(serde_json::json!({}));
            let msg = error_json["error"]["message"].as_str().unwrap_or("Gemini API quota exceeded.");
            
            // Look for retry delay in details
            let retry_msg = if let Some(details) = error_json["error"]["details"].as_array() {
                let delay = details.iter().find(|d| d["@type"] == "type.googleapis.com/google.rpc.RetryInfo")
                    .and_then(|d| d["retryDelay"].as_str());
                if let Some(d) = delay {
                    format!(" {}. Please wait {} before retrying.", msg, d)
                } else {
                    format!(" {}. Please wait a moment or switch to a different provider.", msg)
                }
            } else {
                format!(" {}. Please wait a moment or switch to a different provider.", msg)
            };
            
            return Err(AppError::TooManyRequests(retry_msg));
        }
        return Err(AppError::InternalServerError);
    }

    let data: serde_json::Value = res.json().await.map_err(|_| AppError::InternalServerError)?;
    let text = data["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("{}")
        .to_string();

    Ok(text)
}

/// Helper: call Groq API (OpenAI-compatible)
async fn call_groq(api_key: &str, prompt: &str) -> Result<String, AppError> {
    let client = reqwest::Client::new();
    let res = client.post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": "llama-3.3-70b-versatile",
            "messages": [
                { "role": "system", "content": "You are a helpful assistant. Always respond with valid JSON only, no markdown fences." },
                { "role": "user", "content": prompt }
            ],
            "temperature": 0.7,
            "response_format": { "type": "json_object" }
        }))
        .send()
        .await
        .map_err(|e| {
            eprintln!("Groq API error: {:?}", e);
            AppError::InternalServerError
        })?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        eprintln!("Groq API error {}: {}", status, body);
        return Err(AppError::InternalServerError);
    }

    let data: serde_json::Value = res.json().await.map_err(|_| AppError::InternalServerError)?;
    let text = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("{}")
        .to_string();

    Ok(text)
}

/// Dispatcher: route to the correct LLM provider
async fn call_llm(key: &LlmApiKey, prompt: &str) -> Result<String, AppError> {
    match key.provider.as_str() {
        "gemini" => call_gemini(&key.api_key, prompt).await,
        "groq" => call_groq(&key.api_key, prompt).await,
        // OpenAI-compatible providers can reuse the Groq path with a different URL in the future
        _ => {
            eprintln!("Unsupported provider: {}", key.provider);
            Err(AppError::InternalServerError)
        }
    }
}

/// Public wrappers so the AI course generator module can reuse these callers.
pub async fn call_gemini_pub(api_key: &str, prompt: &str) -> Result<String, AppError> {
    call_gemini(api_key, prompt).await
}

pub async fn call_groq_pub(api_key: &str, prompt: &str) -> Result<String, AppError> {
    call_groq(api_key, prompt).await
}

/// POST /admin/translate
pub async fn translate_text(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<TranslateRequest>,
) -> Result<impl IntoResponse, AppError> {
    let active_key = get_active_key(&state).await?;
    let from_lang = payload.from.as_deref().unwrap_or("English");
    let to_lang = payload.to.as_deref().unwrap_or("Indonesian (Bahasa Indonesia)");

    let prompt = format!(
        "Translate the following text from {} to {}. \
         Return ONLY a JSON object with a single key \"translated\" containing the translation. \
         Do not add explanations.\n\nText: \"{}\"",
        from_lang, to_lang, payload.text
    );

    let result = call_llm(&active_key, &prompt).await?;

    // Parse the JSON response to extract the translated text
    let parsed: serde_json::Value = serde_json::from_str(&result)
        .unwrap_or(serde_json::json!({ "translated": result }));

    Ok(Json(parsed))
}

/// POST /admin/ai-generate
pub async fn ai_generate_content(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<AiGenerateRequest>,
) -> Result<impl IntoResponse, AppError> {
    let active_key = get_active_key(&state).await?;
    let context = payload.context.as_deref().unwrap_or("hospitality industry");

    let default_prompt = match payload.entity_type.as_str() {
        "course" => format!(
            "Generate a JSON object for a new English learning course for the {}. \
             The JSON must have these keys: \"title\", \"title_id\" (Bahasa Indonesia translation), \
             \"description\", \"description_id\" (Bahasa Indonesia translation). \
             Make it professional and engaging for Indonesian learners.", context
        ),
        "module" => format!(
            "Generate a JSON object for a new learning module within a {} English course. \
             The JSON must have these keys: \"title\", \"title_id\" (Bahasa Indonesia translation), \
             \"description\", \"description_id\" (Bahasa Indonesia translation). \
             Make it professional and engaging for Indonesian learners.", context
        ),
        "lesson" => format!(
            "Generate a JSON object for a new lesson within a {} English course. \
             The JSON must have exactly these 7 keys:\n\
             1. \"title\": A catchy title.\n\
             2. \"title_id\": Bahasa Indonesia translation of the title.\n\
             3. \"content\": MUST be a single PLAIN TEXT string formatted with MARKDOWN. DO NOT return a JSON object here. \
                Example format:\n\
                ## Introduction\nWelcome to...\n\n## Vocabulary\n- Word: Translation\n\n## Dialogue\nGuest: Hello\nStaff: Hi\n\
             4. \"content_id\": Bahasa Indonesia translation of the markdown content.\n\
             5. \"instruction\": A brief instruction telling the learner what to do (e.g. \"Read the dialogue and practice with a partner\").\n\
             6. \"instruction_id\": Bahasa Indonesia translation of the instruction.\n\
             7. \"culture_notes\": A short cultural tip for Indonesian learners about politeness, customs, or communication style relevant to the lesson topic.\n\
             Make it professional, practical, and engaging for Indonesian learners.", context
        ),
        "game" => format!(
            "Generate a JSON object for a hospitality English mini-game. Context: {}. \
             The JSON must have these keys: \
             \"title\" (catchy game name), \
             \"instructions\" (PLAIN TEXT instructions), \
             \"data_json\" (a structured object containing the game exercise data). \
             For HANGMAN: data_json has \"word\", \"hint\".\
             For TRUE_FALSE: data_json has \"statements\" array with {{\"text\", \"correct\" (bool)}}.\
             For WORD_ASSOCIATION: data_json has \"base_word\", \"associations\" array.\
             For CATEGORIZATION: data_json has \"categories\" and \"items\" array with {{\"text\", \"category\"}}.\
             For SYNONYM_ANTONYM: data_json has \"word\", \"type\" (synonym/antonym), \"options\", \"correct\".\
             For DIALOGUE_SIM: data_json has \"character\", \"scenario\", \"lines\" array with {{\"speaker\", \"text\"}}.\
             For EMOJI_TO_WORD: data_json has \"emojis\", \"answer\".\
             For WORD_CHAIN: data_json has \"start_word\".\
             For PICTURE_DESCRIPTION: data_json has \"image_description\", \"keywords\" array.\
             For ERROR_CORRECTION: data_json has \"incorrect\", \"correct\", \"explanation\".\
             For RAPID_FIRE: data_json has \"items\" array with {{\"en\", \"id\"}}.\
             For IDIOM_GUESSING: data_json has \"idiom\", \"options\", \"correct\".\
             For RHYME_GAME: data_json has \"word\", \"options\", \"correct\".\
             For VOCABULARY_RPG: data_json has \"quest\", \"questions\" array with {{\"q\", \"a\"}}.\
             For DEBATE_MODE: data_json has \"topic\", \"side\".\
             For SHADOW_READING: data_json has \"text\".\
             For WORD_SNAP: data_json has \"pairs\" array with {{\"en\", \"img_desc\"}}.\
             For TONGUE_TWISTER: data_json has \"text\".\
             For NEWS_HEADLINE: data_json has \"headline\", \"answer\", \"options\".\
             For SONG_LYRICS: data_json has \"lyrics\", \"answer\", \"missing_word\".\
             Generate relevant content. Content must be relevant to hospitality industry.", context
        ),
        _ => return Err(AppError::InternalServerError),
    };

    let prompt_col: Collection<AIPromptConfig> = state.db.database("rustapi").collection("ai_prompts");
    let custom_prompt = prompt_col.find_one(doc! { "entity_type": payload.entity_type.clone() }).await?;
    let prompt = if let Some(p) = custom_prompt {
        p.prompt_template.replace("{context}", &context)
    } else {
        default_prompt
    };

    let result = call_llm(&active_key, &prompt).await?;
    let parsed: serde_json::Value = serde_json::from_str(&result)
        .unwrap_or(serde_json::json!({ "error": "Failed to parse AI response" }));

    Ok(Json(parsed))
}

// ==================== CONTENT VERSIONING ====================

async fn save_content_version(
    state: &Arc<AppState>,
    entity_type: &str,
    entity_id: ObjectId,
    admin_email: String,
    snapshot: bson::Document,
    change_summary: Option<String>,
) -> Result<(), AppError> {
    let col: Collection<ContentVersion> = state.db.database("rustapi").collection("content_versions");
    
    let opts = FindOneOptions::builder().sort(doc! { "version": -1 }).build();
    let latest = col.find_one(doc! { "entity_id": entity_id, "entity_type": entity_type }).with_options(opts).await?;
    let version = latest.map(|v| v.version + 1).unwrap_or(1);

    let cv = ContentVersion {
        id: None,
        entity_type: entity_type.to_string(),
        entity_id,
        version,
        snapshot,
        changed_by: admin_email,
        change_summary,
        created_at: Utc::now(),
    };

    col.insert_one(cv).await?;
    Ok(())
}

/// GET /admin/versions/:entity_type/:entity_id
pub async fn list_content_versions(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path((entity_type, entity_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&entity_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let col: Collection<ContentVersion> = state.db.database("rustapi").collection("content_versions");
    
    let opts = FindOptions::builder().sort(doc! { "version": -1 }).build();
    let cursor = col.find(doc! { "entity_type": entity_type, "entity_id": oid }).with_options(opts).await?;
    let versions: Vec<ContentVersion> = cursor.try_collect().await?;
    
    Ok(Json(versions))
}

/// POST /admin/versions/:entity_type/:entity_id/rollback/:version
pub async fn rollback_content_version(
    State(state): State<Arc<AppState>>,
    admin: Admin,
    Path((entity_type, entity_id, version)): Path<(String, String, i32)>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&entity_id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    let col: Collection<ContentVersion> = state.db.database("rustapi").collection("content_versions");
    
    let cv = col.find_one(doc! { "entity_type": &entity_type, "entity_id": oid, "version": version }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))?;

    match entity_type.as_str() {
        "course" => {
            let coll: Collection<Course> = state.db.database("rustapi").collection("courses");
            if let Ok(Some(curr)) = coll.find_one(doc! { "_id": oid }).await {
                let _ = save_content_version(&state, "course", oid, admin.email.clone(), mongodb::bson::to_document(&curr).unwrap(), Some(format!("Auto-saved before rollback to v{}", version))).await;
            }
            let mut snap = cv.snapshot.clone();
            snap.remove("_id"); 
            coll.update_one(doc! { "_id": oid }, doc! { "$set": snap }).await?;
        },
        "module" => {
            let coll: Collection<Module> = state.db.database("rustapi").collection("modules");
            if let Ok(Some(curr)) = coll.find_one(doc! { "_id": oid }).await {
                let _ = save_content_version(&state, "module", oid, admin.email.clone(), mongodb::bson::to_document(&curr).unwrap(), Some(format!("Auto-saved before rollback to v{}", version))).await;
            }
            let mut snap = cv.snapshot.clone();
            snap.remove("_id");
            coll.update_one(doc! { "_id": oid }, doc! { "$set": snap }).await?;
        },
        "lesson" => {
            let coll: Collection<Lesson> = state.db.database("rustapi").collection("lessons");
            if let Ok(Some(curr)) = coll.find_one(doc! { "_id": oid }).await {
                let _ = save_content_version(&state, "lesson", oid, admin.email.clone(), mongodb::bson::to_document(&curr).unwrap(), Some(format!("Auto-saved before rollback to v{}", version))).await;
            }
            let mut snap = cv.snapshot.clone();
            snap.remove("_id");
            coll.update_one(doc! { "_id": oid }, doc! { "$set": snap }).await?;
        },
        _ => return Err(AppError::NotFound("Not found".to_string())),
    }

    Ok(Json(serde_json::json!({ "message": "Rollback successful" })))
}

/// POST /admin/clone/:entity_type/:id
pub async fn clone_content(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path((entity_type, id)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::NotFound("Not found".to_string()))?;
    
    match entity_type.as_str() {
        "course" => {
            let col: Collection<Course> = state.db.database("rustapi").collection("courses");
            let mut item = col.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
            item.id = None;
            item.title = format!("{} (Copy)", item.title);
            item.is_published = false;
            item.created_at = Utc::now();
            item.updated_at = Utc::now();
            let result = col.insert_one(item.clone()).await?;
            item.id = result.inserted_id.as_object_id();
            return Ok(Json(serde_json::to_value(item).unwrap()));
        },
        "module" => {
            let col: Collection<Module> = state.db.database("rustapi").collection("modules");
            let mut item = col.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
            item.id = None;
            item.title = format!("{} (Copy)", item.title);
            item.is_published = false;
            item.created_at = Utc::now();
            item.updated_at = Utc::now();
            let result = col.insert_one(item.clone()).await?;
            item.id = result.inserted_id.as_object_id();
            return Ok(Json(serde_json::to_value(item).unwrap()));
        },
        "lesson" => {
            let col: Collection<Lesson> = state.db.database("rustapi").collection("lessons");
            let mut item = col.find_one(doc! { "_id": oid }).await?.ok_or(AppError::NotFound("Not found".to_string()))?;
            item.id = None;
            item.title = format!("{} (Copy)", item.title);
            item.is_published = false;
            item.created_at = Utc::now();
            item.updated_at = Utc::now();
            let result = col.insert_one(item.clone()).await?;
            item.id = result.inserted_id.as_object_id();
            return Ok(Json(serde_json::to_value(item).unwrap()));
        },
        _ => Err(AppError::NotFound("Not found".to_string())),
    }
}

// ==================== AI PROMPT TEMPLATES ====================

/// GET /admin/ai-prompts
pub async fn get_ai_prompts(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<AIPromptConfig> = state.db.database("rustapi").collection("ai_prompts");
    let cursor = col.find(doc! {}).await?;
    let prompts: Vec<AIPromptConfig> = cursor.try_collect().await?;
    Ok(Json(prompts))
}

/// PUT /admin/ai-prompts/:entity_type
pub async fn update_ai_prompt(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(entity_type): Path<String>,
    Json(payload): Json<UpdatePromptRequest>,
) -> Result<impl IntoResponse, AppError> {
    let col: Collection<AIPromptConfig> = state.db.database("rustapi").collection("ai_prompts");
    
    let update_doc = doc! {
        "$set": {
            "entity_type": &entity_type,
            "prompt_template": payload.prompt_template,
            "updated_at": bson::DateTime::now()
        }
    };
    
    let opts = mongodb::options::UpdateOptions::builder().upsert(true).build();
    col.update_one(doc! { "entity_type": &entity_type }, update_doc).with_options(opts).await?;
    
    let updated = col.find_one(doc! { "entity_type": &entity_type }).await?.unwrap();
    Ok(Json(updated))
}
