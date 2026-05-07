use axum::{
    extract::{State, Json},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::Collection;
use crate::ai::models::*;
use crate::ai::service::*;
use crate::content::models::*;
use crate::game::models::{GameContent, GameType};
use crate::models::Admin;
use crate::handlers::{AppState, AppError};
use std::sync::Arc;
use bson::oid::ObjectId;
use chrono::{Utc, Datelike};
use mongodb::bson::doc;
use futures::stream::StreamExt;
use futures::TryStreamExt;

// ==================== Phase 1: Generate Course Preview ====================

const DAILY_GENERATION_LIMIT: i64 = 20;

/// POST /admin/ai/generate-course
/// Calls the LLM with a structured prompt, parses the response,
/// and returns a full course preview WITHOUT saving to the database.
/// Also logs token usage and checks credit limits.
pub async fn generate_course(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<GenerateCourseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");

    // 1. Check daily rate limit
    let log_col: Collection<AiGenerationLog> = db.collection("ai_generation_logs");
    let today_start = Utc::now().date_naive().and_hms_opt(0, 0, 0).unwrap();
    let today_bson = bson::DateTime::from_chrono(today_start.and_utc());
    let today_count = log_col.count_documents(doc! {
        "created_at": { "$gte": today_bson },
        "action": "generate_course"
    }).await.unwrap_or(0) as i64;

    if today_count >= DAILY_GENERATION_LIMIT {
        return Err(AppError::BadRequest(format!(
            "Daily generation limit reached ({}/{}). Try again tomorrow.",
            today_count, DAILY_GENERATION_LIMIT
        )));
    }

    // 2. Get all active LLM API keys
    let key_col: Collection<LlmApiKey> = db.collection("llm_api_keys");
    let cursor = key_col.find(doc! { "is_active": true }).await?;
    let active_keys: Vec<LlmApiKey> = cursor.try_collect().await?;

    if active_keys.is_empty() {
        crate::notification::notify_admins(&state.db, "AI API Keys Empty", "No active LLM API keys found. Please add or activate keys in API Key Management.").await;
        return Err(AppError::BadRequest("No active LLM API key found. Please activate an API key in API Key Management.".to_string()));
    }

    // 3. Build the prompt
    let prompt = build_course_prompt(&payload);

    // 4. Try keys until success or all fail
    let mut last_error = None;
    let mut successful_key = None;
    let mut llm_response = None;

    for key in active_keys {
        match call_llm_for_course(&key, &prompt).await {
            Ok(resp) => {
                llm_response = Some(resp);
                successful_key = Some(key);
                break;
            }
            Err(e) => {
                println!("⚠️ API Key ({}) failed: {:?}", key.provider, e);
                last_error = Some(e);
                // Continue to next key
            }
        }
    }

    let active_key = match successful_key {
        Some(k) => k,
        None => {
            crate::notification::notify_admins(&state.db, "AI API Keys Exhausted", "All active AI API keys have reached their limit or failed. Please check credits and error logs.").await;
            return Err(last_error.unwrap_or(AppError::InternalServerError));
        }
    };
    let llm_resp = llm_response.unwrap();

    // 5. Log the generation
    let tokens = (llm_resp.input_tokens, llm_resp.output_tokens, llm_resp.total_tokens);
    let cost = estimate_cost(&active_key.provider, tokens.0, tokens.1);

    let log_entry = AiGenerationLog {
        id: None,
        admin_id: _admin.email.clone(),
        provider: active_key.provider.clone(),
        action: "generate_course".to_string(),
        params: serde_json::json!({
            "topic": payload.topic,
            "level": payload.level,
            "category": payload.category,
        }),
        input_tokens: tokens.0,
        output_tokens: tokens.1,
        total_tokens: tokens.2,
        estimated_cost_usd: cost,
        status: "success".to_string(),
        error_message: None,
        created_at: Utc::now(),
    };
    let _ = log_col.insert_one(log_entry).await;

    // 6. Parse the response
    let preview = parse_course_preview(&llm_resp.text)?;

    // 7. Build response with credit usage info
    let remaining = DAILY_GENERATION_LIMIT - today_count - 1;
    let warning_level = if remaining <= 1 {
        "critical"
    } else if remaining <= 4 {
        "caution"
    } else {
        "ok"
    };

    let response = serde_json::json!({
        "course": preview.course,
        "modules": preview.modules,
        "_meta": {
            "tokens_used": llm_resp.total_tokens,
            "estimated_cost_usd": format!("{:.4}", cost),
            "daily_remaining": remaining,
            "daily_limit": DAILY_GENERATION_LIMIT,
            "warning_level": warning_level,
            "provider": active_key.provider,
        }
    });

    Ok((StatusCode::OK, Json(response)))
}

// ==================== Phase 1.5: Generate Vocabulary Set ====================

/// POST /admin/ai/generate-vocab
pub async fn generate_vocab(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<GenerateVocabRequest>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let log_col: Collection<AiGenerationLog> = db.collection("ai_generation_logs");
    
    // 1. Check daily rate limit
    let today_start = Utc::now().date_naive().and_hms_opt(0, 0, 0).unwrap();
    let today_bson = bson::DateTime::from_chrono(today_start.and_utc());
    let today_count = log_col.count_documents(doc! {
        "created_at": { "$gte": today_bson },
        "action": "generate_vocab"
    }).await.unwrap_or(0) as i64;

    if today_count >= DAILY_GENERATION_LIMIT {
        return Err(AppError::BadRequest(format!(
            "Daily generation limit reached ({}/{}). Try again tomorrow.",
            today_count, DAILY_GENERATION_LIMIT
        )));
    }

    // 2. Get all active LLM API keys
    let key_col: Collection<LlmApiKey> = db.collection("llm_api_keys");
    let cursor = key_col.find(doc! { "is_active": true }).await?;
    let active_keys: Vec<LlmApiKey> = cursor.try_collect().await?;

    if active_keys.is_empty() {
        crate::notification::notify_admins(&state.db, "AI API Keys Empty", "No active LLM API keys found. Please add or activate keys in API Key Management.").await;
        return Err(AppError::BadRequest("No active LLM API key found. Please activate an API key in API Key Management.".to_string()));
    }

    // 3. Build the prompt
    let prompt = build_vocab_prompt(&payload);

    // 4. Try keys until success or all fail
    let mut last_error = None;
    let mut successful_key = None;
    let mut llm_response = None;

    for key in active_keys {
        match call_llm_for_course(&key, &prompt).await {
            Ok(resp) => {
                llm_response = Some(resp);
                successful_key = Some(key);
                break;
            }
            Err(e) => {
                println!("⚠️ API Key ({}) failed for vocab: {:?}", key.provider, e);
                last_error = Some(e);
            }
        }
    }

    let active_key = match successful_key {
        Some(k) => k,
        None => {
            crate::notification::notify_admins(&state.db, "AI API Keys Exhausted", "All active AI API keys have reached their limit or failed. Please check credits and error logs.").await;
            return Err(last_error.unwrap_or(AppError::InternalServerError));
        }
    };
    let llm_resp = llm_response.unwrap();

    // 5. Log the generation
    let tokens = (llm_resp.input_tokens, llm_resp.output_tokens, llm_resp.total_tokens);
    let cost = estimate_cost(&active_key.provider, tokens.0, tokens.1);

    let log_entry = AiGenerationLog {
        id: None,
        admin_id: _admin.email.clone(),
        provider: active_key.provider.clone(),
        action: "generate_vocab".to_string(),
        params: serde_json::json!(payload),
        input_tokens: tokens.0,
        output_tokens: tokens.1,
        total_tokens: tokens.2,
        estimated_cost_usd: cost,
        status: "success".to_string(),
        error_message: None,
        created_at: Utc::now(),
    };
    let _ = log_col.insert_one(log_entry).await;

    // 6. Parse the response
    let preview = parse_vocab_preview(&llm_resp.text)?;

    // 7. Build response
    let remaining = DAILY_GENERATION_LIMIT - today_count - 1;
    let warning_level = if remaining <= 1 { "critical" } else if remaining <= 4 { "caution" } else { "ok" };

    let response = serde_json::json!({
        "preview": preview,
        "_meta": {
            "tokens_used": llm_resp.total_tokens,
            "estimated_cost_usd": format!("{:.4}", cost),
            "daily_remaining": remaining,
            "daily_limit": DAILY_GENERATION_LIMIT,
            "warning_level": warning_level,
            "provider": active_key.provider,
        }
    });

    Ok((StatusCode::OK, Json(response)))
}

// ==================== Phase 3: Admin Conversation Request Queue ====================

/// GET /admin/conversation-requests — list all pending student requests
pub async fn list_conversation_requests(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col = db.collection::<crate::vocab::models::ConversationRequest>("conversation_requests");
    let word_col = db.collection::<crate::vocab::models::VocabWord>("vocab_words");

    let mut cursor = col.find(doc! {}).await?;
    let mut results = Vec::new();

    while let Some(req) = cursor.next().await {
        let r = req?;
        // Fetch the actual word data for each request
        let mut words = Vec::new();
        for wid in &r.target_vocab {
            if let Ok(Some(w)) = word_col.find_one(doc! { "_id": wid }).await {
                words.push(serde_json::json!({
                    "_id": w.id.map(|id| id.to_hex()),
                    "word": w.word,
                    "translation": w.translation,
                }));
            }
        }

        results.push(serde_json::json!({
            "_id": r.id.map(|id| id.to_hex()),
            "user_id": r.user_id,
            "context_note": r.context_note,
            "status": r.status,
            "target_words": words,
            "created_at": r.created_at,
            "resolved_at": r.resolved_at,
        }));
    }

    Ok(Json(results))
}

/// POST /admin/conversation-requests/:id/generate — generate a speaking scenario
pub async fn fulfill_conversation_request(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    axum::extract::Path(request_id): axum::extract::Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let req_col = db.collection::<crate::vocab::models::ConversationRequest>("conversation_requests");
    let word_col = db.collection::<crate::vocab::models::VocabWord>("vocab_words");

    let req_oid = ObjectId::parse_str(&request_id)
        .map_err(|_| AppError::BadRequest("Invalid request ID".to_string()))?;

    // 1. Find the request
    let conv_req = req_col.find_one(doc! { "_id": req_oid }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))?;

    if conv_req.status != "pending" {
        return Err(AppError::BadRequest("Request already processed".to_string()));
    }

    // 2. Fetch the target words
    let mut word_list = Vec::new();
    for wid in &conv_req.target_vocab {
        if let Ok(Some(w)) = word_col.find_one(doc! { "_id": wid }).await {
            word_list.push(format!("{} ({})", w.word, w.translation));
        }
    }

    // 3. Build a conversation scenario prompt
    let mut prompt = String::new();
    prompt.push_str("You are an expert ESL conversation designer.\n\n");
    prompt.push_str("Generate a realistic roleplay conversation scenario in JSON format.\n\n");
    prompt.push_str(&format!("## Context\nStudent's note: \"{}\"\n\n", conv_req.context_note));
    prompt.push_str("## Target Vocabulary (MUST be used naturally in the dialogue)\n");
    for w in &word_list {
        prompt.push_str(&format!("- {}\n", w));
    }
    prompt.push_str("\n## Required JSON Structure\n");
    let schema = serde_json::json!({
        "title": "Scenario title",
        "context": "Scene description",
        "roles": ["Student", "Partner"],
        "lines": [
            { "speaker": "Partner", "text_en": "English", "text_id": "Indonesian" },
            { "speaker": "Student", "text_en": "English", "text_id": "Indonesian" }
        ],
        "coaching_tips": ["Tip about using word X", "Tip about pronunciation"]
    });
    prompt.push_str(&serde_json::to_string_pretty(&schema).unwrap());
    prompt.push_str("\n\nOutput only valid JSON. Dialogue should be 8-12 lines.");

    // 4. Call LLM
    let key_col: Collection<LlmApiKey> = db.collection("llm_api_keys");
    let cursor = key_col.find(doc! { "is_active": true }).await?;
    let active_keys: Vec<LlmApiKey> = cursor.try_collect().await?;

    if active_keys.is_empty() {
        crate::notification::notify_admins(&state.db, "AI API Keys Empty", "No active LLM API keys found. Please add or activate keys in API Key Management.").await;
        return Err(AppError::BadRequest("No active LLM API key found. Please activate an API key in API Key Management.".to_string()));
    }

    let mut last_error = None;
    let mut llm_response = None;

    for key in active_keys {
        match call_llm_for_course(&key, &prompt).await {
            Ok(resp) => {
                llm_response = Some(resp);
                break;
            }
            Err(e) => {
                println!("⚠️ API Key ({}) failed for conversation scenario: {:?}", key.provider, e);
                last_error = Some(e);
            }
        }
    }

    let llm_response = match llm_response {
        Some(resp) => resp,
        None => {
            crate::notification::notify_admins(&state.db, "AI API Keys Exhausted", "All active AI API keys have reached their limit or failed. Please check credits and error logs.").await;
            return Err(last_error.unwrap_or(AppError::InternalServerError));
        }
    };

    // 5. Update request status
    let now = mongodb::bson::DateTime::now();
    req_col.update_one(
        doc! { "_id": req_oid },
        doc! { "$set": {
            "status": "generated",
            "resolved_at": now,
        }},
    ).await?;

    // 6. Return the generated scenario
    let scenario: serde_json::Value = serde_json::from_str(llm_response.text.trim())
        .unwrap_or_else(|_| serde_json::json!({ "raw": llm_response.text }));

    Ok((StatusCode::OK, Json(serde_json::json!({
        "scenario": scenario,
        "request_id": request_id,
        "status": "generated",
    }))))
}

/// GET /admin/ai/credit-usage
/// Returns current credit usage summary for the admin dashboard.
pub async fn get_credit_usage(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let log_col: Collection<AiGenerationLog> = db.collection("ai_generation_logs");

    // Today's usage
    let today_start = Utc::now().date_naive().and_hms_opt(0, 0, 0).unwrap();
    let today_bson = bson::DateTime::from_chrono(today_start.and_utc());

    let today_count = log_col.count_documents(doc! {
        "created_at": { "$gte": today_bson }
    }).await.unwrap_or(0) as i64;

    // Month's usage
    let month_start = Utc::now().date_naive().with_day(1).unwrap().and_hms_opt(0, 0, 0).unwrap();
    let month_bson = bson::DateTime::from_chrono(month_start.and_utc());

    let month_count = log_col.count_documents(doc! {
        "created_at": { "$gte": month_bson }
    }).await.unwrap_or(0) as i64;

    // Aggregate tokens and cost for today
    use futures::TryStreamExt;
    let today_cursor = log_col.find(doc! { "created_at": { "$gte": today_bson } }).await?;
    let today_logs: Vec<AiGenerationLog> = today_cursor.try_collect().await?;
    let today_tokens: i64 = today_logs.iter().map(|l| l.total_tokens).sum();
    let today_cost: f64 = today_logs.iter().map(|l| l.estimated_cost_usd).sum();

    // Aggregate for month
    let month_cursor = log_col.find(doc! { "created_at": { "$gte": month_bson } }).await?;
    let month_logs: Vec<AiGenerationLog> = month_cursor.try_collect().await?;
    let month_tokens: i64 = month_logs.iter().map(|l| l.total_tokens).sum();
    let month_cost: f64 = month_logs.iter().map(|l| l.estimated_cost_usd).sum();

    let daily_remaining = (DAILY_GENERATION_LIMIT - today_count).max(0);
    let warning_level = if daily_remaining == 0 {
        "exceeded"
    } else if daily_remaining <= 1 {
        "critical"
    } else if daily_remaining <= 4 {
        "caution"
    } else {
        "ok"
    };

    let summary = CreditUsageSummary {
        today_count,
        today_tokens,
        today_cost_usd: today_cost,
        month_count,
        month_tokens,
        month_cost_usd: month_cost,
        daily_limit: DAILY_GENERATION_LIMIT,
        daily_remaining,
        warning_level: warning_level.to_string(),
    };

    Ok(Json(summary))
}

// ==================== Phase 2: Save Course to MongoDB ====================

/// POST /admin/ai/save-course
/// Takes the admin-approved (and potentially edited) preview,
/// chains ObjectIds, and persists across all 7 collections.
pub async fn save_course(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<SaveCourseRequest>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let preview = payload.preview;

    // Track inserted IDs for rollback on failure
    #[allow(unused_assignments)]
    let mut inserted_course_id: Option<ObjectId> = None;
    let mut inserted_module_ids: Vec<ObjectId> = Vec::new();
    let mut inserted_lesson_ids: Vec<ObjectId> = Vec::new();
    let mut inserted_vocab_ids: Vec<ObjectId> = Vec::new();
    let mut inserted_dialogue_ids: Vec<ObjectId> = Vec::new();
    let mut inserted_quiz_ids: Vec<ObjectId> = Vec::new();
    let mut inserted_game_ids: Vec<ObjectId> = Vec::new();

    // Helper closure for rollback
    let rollback = |course_id: Option<ObjectId>,
                    module_ids: Vec<ObjectId>,
                    lesson_ids: Vec<ObjectId>,
                    vocab_ids: Vec<ObjectId>,
                    dialogue_ids: Vec<ObjectId>,
                    quiz_ids: Vec<ObjectId>,
                    game_ids: Vec<ObjectId>,
                    db: mongodb::Database| async move {
        eprintln!("🔄 Rolling back AI course insert...");
        let _ = db.collection::<GameContent>("games").delete_many(doc! { "_id": { "$in": game_ids.iter().map(|id| bson::Bson::ObjectId(*id)).collect::<Vec<_>>() } }).await;
        let _ = db.collection::<Quiz>("quizzes").delete_many(doc! { "_id": { "$in": quiz_ids.iter().map(|id| bson::Bson::ObjectId(*id)).collect::<Vec<_>>() } }).await;
        let _ = db.collection::<Dialogue>("dialogues").delete_many(doc! { "_id": { "$in": dialogue_ids.iter().map(|id| bson::Bson::ObjectId(*id)).collect::<Vec<_>>() } }).await;
        let _ = db.collection::<Vocabulary>("vocabulary").delete_many(doc! { "_id": { "$in": vocab_ids.iter().map(|id| bson::Bson::ObjectId(*id)).collect::<Vec<_>>() } }).await;
        let _ = db.collection::<Lesson>("lessons").delete_many(doc! { "_id": { "$in": lesson_ids.iter().map(|id| bson::Bson::ObjectId(*id)).collect::<Vec<_>>() } }).await;
        let _ = db.collection::<Module>("modules").delete_many(doc! { "_id": { "$in": module_ids.iter().map(|id| bson::Bson::ObjectId(*id)).collect::<Vec<_>>() } }).await;
        if let Some(cid) = course_id {
            let _ = db.collection::<Course>("courses").delete_one(doc! { "_id": cid }).await;
        }
        eprintln!("🔄 Rollback complete.");
    };

    // ---- 1. Insert Course ----
    let course_col: Collection<Course> = db.collection("courses");
    let p = &preview.course;

    let skill_focus: Vec<SkillType> = p.skill_focus.iter()
        .filter_map(|s| parse_skill_type(s))
        .collect();

    let course = Course {
        id: None,
        title: p.title.clone(),
        title_id: Some(p.title_id.clone()),
        description: p.description.clone(),
        description_id: Some(p.description_id.clone()),
        category: parse_category(&p.category).unwrap_or(ContentCategory::General),
        level: parse_level(&p.level).unwrap_or(ContentLevel::A1),
        status: CourseStatus::Draft,
        skill_focus,
        target_age: parse_target_age(&p.target_age).unwrap_or(TargetAge::Adults),
        estimated_duration: p.estimated_duration.clone(),
        is_paid: false,
        enrollment_cap: None,
        visibility: Visibility::Public,
        cover_image_url: None,
        source: Some("ai_generated".to_string()),
        is_published: false,
        order: 0,
        tags: if p.tags.is_empty() { None } else { Some(p.tags.clone()) },
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let c_res = match course_col.insert_one(course).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Failed to insert course: {:?}", e);
            return Err(AppError::InternalServerError);
        }
    };
    let course_id = c_res.inserted_id.as_object_id().unwrap();
    inserted_course_id = Some(course_id);

    // ---- 2. Insert Modules, Lessons, Vocab, Dialogues, Quizzes, Games ----
    let module_col: Collection<Module> = db.collection("modules");
    let lesson_col: Collection<Lesson> = db.collection("lessons");
    let vocab_col: Collection<Vocabulary> = db.collection("vocabulary");
    let dialogue_col: Collection<Dialogue> = db.collection("dialogues");
    let quiz_col: Collection<Quiz> = db.collection("quizzes");
    let game_col: Collection<GameContent> = db.collection("games");

    let category_enum = parse_category(&preview.course.category).unwrap_or(ContentCategory::General);
    let level_enum = parse_level(&preview.course.level).unwrap_or(ContentLevel::A1);

    for (mi, gen_module) in preview.modules.iter().enumerate() {
        let skill_tags: Vec<SkillType> = gen_module.skill_tags.iter()
            .filter_map(|s| parse_skill_type(s))
            .collect();

        let module = Module {
            id: None,
            course_id,
            title: gen_module.title.clone(),
            title_id: Some(gen_module.title_id.clone()),
            description: gen_module.description.clone(),
            description_id: Some(gen_module.description_id.clone()),
            prerequisite_id: None,
            passing_score_threshold: None,
            skill_tags,
            order: gen_module.order,
            is_published: false,
            is_optional: false,
            tags: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let m_res = match module_col.insert_one(module).await {
            Ok(r) => r,
            Err(e) => {
                eprintln!("Failed to insert module {}: {:?}", mi, e);
                rollback(inserted_course_id, inserted_module_ids, inserted_lesson_ids, inserted_vocab_ids, inserted_dialogue_ids, inserted_quiz_ids, inserted_game_ids, db.clone()).await;
                return Err(AppError::InternalServerError);
            }
        };
        let module_id = m_res.inserted_id.as_object_id().unwrap();
        inserted_module_ids.push(module_id);

        for (li, gen_lesson) in gen_module.lessons.iter().enumerate() {
            let lesson = Lesson {
                id: None,
                module_id,
                title: gen_lesson.title.clone(),
                title_id: Some(gen_lesson.title_id.clone()),
                content: gen_lesson.content.clone(),
                content_id: Some(gen_lesson.content_id.clone()),
                instruction: Some(gen_lesson.instruction.clone()),
                instruction_id: Some(gen_lesson.instruction_id.clone()),
                culture_notes: if gen_lesson.culture_notes.is_empty() { None } else { Some(gen_lesson.culture_notes.clone()) },
                audio_url: None,
                level: level_enum.clone(),
                category: category_enum.clone(),
                xp_reward: gen_lesson.xp_reward,
                order: gen_lesson.order,
                is_published: false,
                tags: None,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };

            let l_res = match lesson_col.insert_one(lesson).await {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("Failed to insert lesson {}.{}: {:?}", mi, li, e);
                    rollback(inserted_course_id, inserted_module_ids, inserted_lesson_ids, inserted_vocab_ids, inserted_dialogue_ids, inserted_quiz_ids, inserted_game_ids, db.clone()).await;
                    return Err(AppError::InternalServerError);
                }
            };
            let lesson_id = l_res.inserted_id.as_object_id().unwrap();
            inserted_lesson_ids.push(lesson_id);

            // -- Vocabulary --
            for vocab in &gen_lesson.vocabulary {
                let v = Vocabulary {
                    id: None,
                    lesson_id,
                    word: vocab.word.clone(),
                    translation: vocab.translation.clone(),
                    pronunciation: Some(vocab.pronunciation.clone()),
                    audio_url: None,
                    example_en: vocab.example_en.clone(),
                    example_id: Some(vocab.example_id.clone()),
                    created_at: Utc::now(),
                };
                match vocab_col.insert_one(v).await {
                    Ok(r) => { inserted_vocab_ids.push(r.inserted_id.as_object_id().unwrap()); }
                    Err(e) => {
                        eprintln!("Failed to insert vocabulary: {:?}", e);
                        rollback(inserted_course_id, inserted_module_ids, inserted_lesson_ids, inserted_vocab_ids, inserted_dialogue_ids, inserted_quiz_ids, inserted_game_ids, db.clone()).await;
                        return Err(AppError::InternalServerError);
                    }
                }
            }

            // -- Dialogue --
            if let Some(gen_dialogue) = &gen_lesson.dialogue {
                let dialogue = Dialogue {
                    id: None,
                    lesson_id,
                    title: gen_dialogue.title.clone(),
                    context: Some(gen_dialogue.context.clone()),
                    lines: gen_dialogue.lines.iter().map(|l| DialogueLine {
                        speaker: l.speaker.clone(),
                        text_en: l.text_en.clone(),
                        text_id: Some(l.text_id.clone()),
                        audio_url: None,
                    }).collect(),
                    created_at: Utc::now(),
                };
                match dialogue_col.insert_one(dialogue).await {
                    Ok(r) => { inserted_dialogue_ids.push(r.inserted_id.as_object_id().unwrap()); }
                    Err(e) => {
                        eprintln!("Failed to insert dialogue: {:?}", e);
                        rollback(inserted_course_id, inserted_module_ids, inserted_lesson_ids, inserted_vocab_ids, inserted_dialogue_ids, inserted_quiz_ids, inserted_game_ids, db.clone()).await;
                        return Err(AppError::InternalServerError);
                    }
                }
            }

            // -- Quiz --
            if let Some(gen_quiz) = &gen_lesson.quiz {
                let quiz = Quiz {
                    id: None,
                    lesson_id,
                    title: gen_quiz.title.clone(),
                    passing_score: gen_quiz.passing_score,
                    xp_reward: gen_quiz.xp_reward,
                    questions: gen_quiz.questions.iter().map(|q| QuizQuestion {
                        question: q.question.clone(),
                        question_id: Some(q.question_id.clone()),
                        options: q.options.clone(),
                        correct_answer: q.correct_answer,
                    }).collect(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                };
                match quiz_col.insert_one(quiz).await {
                    Ok(r) => { inserted_quiz_ids.push(r.inserted_id.as_object_id().unwrap()); }
                    Err(e) => {
                        eprintln!("Failed to insert quiz: {:?}", e);
                        rollback(inserted_course_id, inserted_module_ids, inserted_lesson_ids, inserted_vocab_ids, inserted_dialogue_ids, inserted_quiz_ids, inserted_game_ids, db.clone()).await;
                        return Err(AppError::InternalServerError);
                    }
                }
            }

            // -- Games --
            for (gi, gen_game) in gen_lesson.games.iter().enumerate() {
                let game = GameContent {
                    id: None,
                    module_id: Some(module_id),
                    lesson_id,
                    game_type: parse_game_type(&gen_game.game_type).unwrap_or(GameType::SceneMatcher),
                    title: gen_game.title.clone(),
                    instructions: gen_game.instructions.clone(),
                    difficulty: gen_game.difficulty.clone(),
                    asset_url: None,
                    data_json: gen_game.data_json.clone(),
                    ai_scenario_id: None,
                    xp_reward: gen_game.xp_reward,
                    is_active: true,
                    order: gi as i32 + 1,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                };
                match game_col.insert_one(game).await {
                    Ok(r) => { inserted_game_ids.push(r.inserted_id.as_object_id().unwrap()); }
                    Err(e) => {
                        eprintln!("Failed to insert game: {:?}", e);
                        rollback(inserted_course_id, inserted_module_ids, inserted_lesson_ids, inserted_vocab_ids, inserted_dialogue_ids, inserted_quiz_ids, inserted_game_ids, db.clone()).await;
                        return Err(AppError::InternalServerError);
                    }
                }
            }
        }
    }

    // Build summary response
    let summary = serde_json::json!({
        "message": "Course saved successfully",
        "course_id": course_id.to_string(),
        "stats": {
            "modules": inserted_module_ids.len(),
            "lessons": inserted_lesson_ids.len(),
            "vocabulary": inserted_vocab_ids.len(),
            "dialogues": inserted_dialogue_ids.len(),
            "quizzes": inserted_quiz_ids.len(),
            "games": inserted_game_ids.len(),
        }
    });

    Ok((StatusCode::CREATED, Json(summary)))
}

// ==================== Helpers: parse string → enum ====================

fn parse_level(s: &str) -> Option<ContentLevel> {
    match s.to_lowercase().as_str() {
        "a1" => Some(ContentLevel::A1),
        "a2" => Some(ContentLevel::A2),
        "b1" => Some(ContentLevel::B1),
        "b2" => Some(ContentLevel::B2),
        "c1" => Some(ContentLevel::C1),
        "c2" => Some(ContentLevel::C2),
        _ => None,
    }
}

fn parse_category(s: &str) -> Option<ContentCategory> {
    match s.to_lowercase().as_str() {
        "restaurant" => Some(ContentCategory::Restaurant),
        "hotel" => Some(ContentCategory::Hotel),
        "cruise" => Some(ContentCategory::Cruise),
        "interview" => Some(ContentCategory::Interview),
        "general" => Some(ContentCategory::General),
        "business" => Some(ContentCategory::Business),
        "travel" => Some(ContentCategory::Travel),
        _ => None,
    }
}

fn parse_target_age(s: &str) -> Option<TargetAge> {
    match s.to_lowercase().as_str() {
        "kids" => Some(TargetAge::Kids),
        "teens" => Some(TargetAge::Teens),
        "adults" => Some(TargetAge::Adults),
        "all" => Some(TargetAge::All),
        _ => None,
    }
}

fn parse_skill_type(s: &str) -> Option<SkillType> {
    match s.to_lowercase().as_str() {
        "speaking" => Some(SkillType::Speaking),
        "listening" => Some(SkillType::Listening),
        "reading" => Some(SkillType::Reading),
        "writing" => Some(SkillType::Writing),
        "grammar" => Some(SkillType::Grammar),
        "vocabulary" => Some(SkillType::Vocabulary),
        "pronunciation" => Some(SkillType::Pronunciation),
        _ => None,
    }
}

fn parse_game_type(s: &str) -> Option<GameType> {
    match s.to_uppercase().as_str() {
        "SCENE_MATCHER" => Some(GameType::SceneMatcher),
        "RESPECT_MASTER" => Some(GameType::RespectMaster),
        "VOICE_STAR" => Some(GameType::VoiceStar),
        "WORD_SCRAMBLE" => Some(GameType::WordScramble),
        "MATCHING" => Some(GameType::Matching),
        "FILL_IN_THE_BLANK" => Some(GameType::FillInTheBlank),
        "ROLE_PLAY" => Some(GameType::RolePlay),
        "TRANSLATION" => Some(GameType::Translation),
        _ => None,
    }
}

pub async fn call_gemini_generic(api_key: &str, prompt: &str) -> Result<serde_json::Value, AppError> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}",
        api_key
    );

    let body = serde_json::json!({
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    });

    let resp = client.post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|_| AppError::InternalServerError)?;

    if !resp.status().is_success() {
        return Err(AppError::InternalServerError);
    }

    let json: serde_json::Value = resp.json().await.map_err(|_| AppError::InternalServerError)?;
    
    let text = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or(AppError::InternalServerError)?;

    let parsed: serde_json::Value = serde_json::from_str(text.trim())
        .map_err(|_| AppError::InternalServerError)?;

    Ok(parsed)
}
