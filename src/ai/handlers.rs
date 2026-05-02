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
use chrono::Utc;
use mongodb::bson::doc;

// ==================== Phase 1: Generate Course Preview ====================

/// POST /admin/ai/generate-course
/// Calls the LLM with a structured prompt, parses the response,
/// and returns a full course preview WITHOUT saving to the database.
pub async fn generate_course(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Json(payload): Json<GenerateCourseRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Get active LLM API key
    let col: Collection<LlmApiKey> = state.db.database("rustapi").collection("llm_api_keys");
    let active_key = col.find_one(doc! { "is_active": true }).await?
        .ok_or(AppError::NotFound)?;

    // 2. Build the prompt
    let prompt = build_course_prompt(&payload);

    // 3. Call the LLM
    let raw_response = call_llm_for_course(&active_key, &prompt).await?;

    // 4. Parse into structured preview
    let preview = parse_course_preview(&raw_response)?;

    Ok((StatusCode::OK, Json(preview)))
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
