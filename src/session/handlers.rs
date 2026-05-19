use axum::{
    extract::{Path, State, Json},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::Collection;
use mongodb::bson::{doc, oid::ObjectId};
use std::sync::Arc;
use chrono::Utc;
use futures::TryStreamExt;
use serde_json::json;

use crate::handlers::{AppState, AppError};
use crate::models::Admin;
use crate::content::models::*;
use crate::game::models::GameContent;
use crate::session::models::*;

// ==================== Mobile: Session Assembly ====================

/// GET /api/lessons/:id/session
/// Assembles the full session payload for a lesson by resolving
/// level template + per-lesson overrides + fetching related content.
pub async fn get_lesson_session(
    State(state): State<Arc<AppState>>,
    Path(lesson_id_str): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let lesson_oid = ObjectId::parse_str(&lesson_id_str)
        .map_err(|_| AppError::BadRequest("Invalid lesson ID".into()))?;

    // 1. Fetch the lesson
    let lesson_col: Collection<Lesson> = db.collection("lessons");
    let lesson = lesson_col.find_one(doc! { "_id": lesson_oid }).await?
        .ok_or(AppError::NotFound("Lesson not found".into()))?;

    // 2. Look up per-lesson config override
    let config_col: Collection<LessonSessionConfig> = db.collection("lesson_session_configs");
    let lesson_config = config_col.find_one(doc! { "lesson_id": lesson_oid }).await?;

    // 3. Look up level template
    let level_str = serde_json::to_value(&lesson.level)
        .ok()
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "A1".to_string());
    let template_col: Collection<LevelTemplate> = db.collection("level_templates");
    let template = template_col.find_one(doc! { "level": &level_str }).await?;

    // 4. Resolve phases, lives, xp_multiplier
    let (phases, lives, xp_mult) = resolve_config(&lesson_config, &template);

    // 5. Fetch related content
    let vocab_col: Collection<Vocabulary> = db.collection("vocabulary");
    let vocab_cursor = vocab_col.find(doc! { "lesson_id": lesson_oid }).await?;
    let vocabulary: Vec<Vocabulary> = vocab_cursor.try_collect().await?;

    let dialogue_col: Collection<Dialogue> = db.collection("dialogues");
    let dialogue = dialogue_col.find_one(doc! { "lesson_id": lesson_oid }).await?;

    let game_col: Collection<GameContent> = db.collection("games");
    let game_cursor = game_col.find(doc! { "lesson_id": lesson_oid, "is_active": true }).await?;
    let games: Vec<GameContent> = game_cursor.try_collect().await?;

    // 6. Build pronunciation sentences
    let pron_sentences = build_pronunciation_sentences(&lesson_config, &dialogue, &phases);

    // 7. Build conversation context
    let conv_prompt = build_conversation_prompt(&lesson_config, &lesson);

    // 8. Assemble response (with graceful degradation per Section 16)
    let mut phase_data = Vec::new();
    for phase in &phases {
        if !phase.enabled {
            continue;
        }
        let data = match phase.phase_type {
            SessionPhaseType::Read => json!({
                "content": lesson.content,
                "content_id": lesson.content_id,
                "instruction": lesson.instruction,
                "culture_notes": lesson.culture_notes,
                "audio_url": lesson.audio_url,
                "video_url": lesson.video_url,
                "image_url": lesson.image_url,
                "xp_reward": 5,
            }),
            SessionPhaseType::Flashcard => {
                let mut words_source = vocabulary.clone();
                if let Some(group_ids) = &phase.settings.specific_vocab_group_ids {
                    if !group_ids.is_empty() {
                        let col: Collection<crate::vocab::models::VocabWord> = db.collection("vocab_words");
                        let cursor = col.find(doc! { "set_id": { "$in": group_ids } }).await?;
                        let vocab_words: Vec<crate::vocab::models::VocabWord> = cursor.try_collect().await?;
                        words_source = vocab_words.into_iter().map(|v| Vocabulary {
                            id: v.id,
                            lesson_id: lesson_oid,
                            word: v.word,
                            translation: v.translation,
                            pronunciation: Some(v.pronunciation_guide),
                            audio_url: v.audio_url,
                            example_en: v.example_sentence,
                            example_id: None,
                            created_at: Utc::now(),
                        }).collect();
                    }
                } else if let Some(specific_ids) = &phase.settings.specific_vocab_ids {
                    if !specific_ids.is_empty() {
                        let col: Collection<Vocabulary> = db.collection("vocabulary");
                        let cursor = col.find(doc! { "_id": { "$in": specific_ids } }).await?;
                        words_source = cursor.try_collect().await?;
                    }
                }

                if let Some(excluded) = &phase.settings.excluded_vocab_ids {
                    if !excluded.is_empty() {
                        words_source.retain(|w| {
                            match w.id {
                                Some(id) => !excluded.contains(&id),
                                None => true,
                            }
                        });
                    }
                }

                if words_source.is_empty() {
                    eprintln!("[WARN] Flashcard phase skipped: no vocabulary for lesson {}", lesson_id_str);
                    continue;
                }
                let words: Vec<serde_json::Value> = words_source.iter().map(|v| json!({
                    "id": v.id.map(|id| id.to_hex()),
                    "word": v.word,
                    "translation": v.translation,
                    "pronunciation": v.pronunciation,
                    "example_en": v.example_en,
                    "example_id": v.example_id,
                    "audio_url": v.audio_url,
                })).collect();
                let auto_play = phase.settings.auto_play_audio.unwrap_or(true);
                json!({
                    "words": words,
                    "auto_play_audio": auto_play,
                    "xp_reward": 10,
                })
            },
            SessionPhaseType::VocabDrill => {
                let mut words_source = vocabulary.clone();
                if let Some(group_ids) = &phase.settings.specific_vocab_group_ids {
                    if !group_ids.is_empty() {
                        let col: Collection<crate::vocab::models::VocabWord> = db.collection("vocab_words");
                        let cursor = col.find(doc! { "set_id": { "$in": group_ids } }).await?;
                        let vocab_words: Vec<crate::vocab::models::VocabWord> = cursor.try_collect().await?;
                        words_source = vocab_words.into_iter().map(|v| Vocabulary {
                            id: v.id,
                            lesson_id: lesson_oid,
                            word: v.word,
                            translation: v.translation,
                            pronunciation: Some(v.pronunciation_guide),
                            audio_url: v.audio_url,
                            example_en: v.example_sentence,
                            example_id: None,
                            created_at: Utc::now(),
                        }).collect();
                    }
                } else if let Some(specific_ids) = &phase.settings.specific_vocab_ids {
                    if !specific_ids.is_empty() {
                        let col: Collection<Vocabulary> = db.collection("vocabulary");
                        let cursor = col.find(doc! { "_id": { "$in": specific_ids } }).await?;
                        words_source = cursor.try_collect().await?;
                    }
                }

                if let Some(excluded) = &phase.settings.excluded_vocab_ids {
                    if !excluded.is_empty() {
                        words_source.retain(|w| {
                            match w.id {
                                Some(id) => !excluded.contains(&id),
                                None => true,
                            }
                        });
                    }
                }

                let drills = build_vocab_drills(&words_source, &phase.settings);
                if drills.is_empty() {
                    eprintln!("[WARN] VocabDrill phase skipped: no drills generated for lesson {}", lesson_id_str);
                    continue;
                }
                json!({
                    "drills": drills,
                    "xp_reward": 15,
                })
            },
            SessionPhaseType::Game => {
                let mut games_source = games.clone();
                if let Some(specific_ids) = &phase.settings.specific_game_ids {
                    if !specific_ids.is_empty() {
                        let col: Collection<GameContent> = db.collection("games");
                        let cursor = col.find(doc! { "_id": { "$in": specific_ids } }).await?;
                        games_source = cursor.try_collect().await?;
                    }
                }

                let difficulty = phase.settings.difficulty.clone().unwrap_or_else(|| "easy".into());
                let game_data: Vec<serde_json::Value> = games_source.iter()
                    .filter(|g| g.difficulty.to_lowercase() == difficulty.to_lowercase() || phase.settings.specific_game_ids.is_some())
                    .map(|g| json!({
                        "id": g.id.map(|id| id.to_hex()),
                        "game_type": g.game_type,
                        "title": g.title,
                        "instructions": g.instructions,
                        "difficulty": g.difficulty,
                        "data_json": g.data_json,
                        "xp_reward": g.xp_reward,
                        "order": g.order,
                    })).collect();
                if game_data.is_empty() {
                    eprintln!("[WARN] Game phase skipped: no games for difficulty '{}' in lesson {}", difficulty, lesson_id_str);
                    continue;
                }
                json!({
                    "games": game_data,
                    "video_url": phase.settings.video_url,
                    "xp_reward": 20,
                    "difficulty": difficulty,
                })
            },
            SessionPhaseType::Pronunciation => {
                let count = phase.settings.sentence_count.unwrap_or(3) as usize;
                let sentences: Vec<&str> = pron_sentences.iter().take(count).map(|s| s.as_str()).collect();
                if sentences.is_empty() {
                    // ── GRACEFUL DEGRADATION (Section 16.3) ──
                    // If no pronunciation sentences are available, replace this
                    // phase with a safe VocabDrill to prevent session abandonment.
                    eprintln!("[WARN] Pronunciation phase DEGRADED → VocabDrill (no sentences) for lesson {}", lesson_id_str);
                    let fallback_drills = build_vocab_drills(&vocabulary, &PhaseSettings {
                        drill_types: Some(vec!["matching".into()]),
                        max_drill_count: Some(2),
                        ..Default::default()
                    });
                    if fallback_drills.is_empty() {
                        continue; // Nothing to show — skip entirely
                    }
                    phase_data.push(json!({
                        "type": SessionPhaseType::VocabDrill,
                        "order": phase.order,
                        "data": { "drills": fallback_drills, "xp_reward": 10, "is_fallback": true },
                    }));
                    continue;
                }
                let min_acc = phase.settings.min_accuracy_score.unwrap_or(60.0);
                let speed = phase.settings.speed.clone().unwrap_or_else(|| "normal".into());
                json!({
                    "sentences": sentences,
                    "min_accuracy": min_acc,
                    "speed": speed,
                    "xp_reward": 15,
                })
            },
            SessionPhaseType::Conversation => {
                if conv_prompt.is_empty() {
                    // ── GRACEFUL DEGRADATION (Section 16.3) ──
                    // If conversation context is missing, replace with a VocabDrill.
                    eprintln!("[WARN] Conversation phase DEGRADED → VocabDrill (no prompt) for lesson {}", lesson_id_str);
                    let fallback_drills = build_vocab_drills(&vocabulary, &PhaseSettings {
                        drill_types: Some(vec!["fill_in_the_blank".into()]),
                        max_drill_count: Some(2),
                        ..Default::default()
                    });
                    if fallback_drills.is_empty() {
                        continue;
                    }
                    phase_data.push(json!({
                        "type": SessionPhaseType::VocabDrill,
                        "order": phase.order,
                        "data": { "drills": fallback_drills, "xp_reward": 10, "is_fallback": true },
                    }));
                    continue;
                }
                let turns = phase.settings.turn_count.unwrap_or(3);
                let branching = lesson_config.as_ref()
                    .and_then(|c| c.branching_tree.clone())
                    .or_else(|| dialogue.as_ref().and_then(|d| d.branching_tree.clone()));
                json!({
                    "scenario_context": conv_prompt,
                    "turn_count": turns,
                    "branching_tree": branching,
                    "xp_reward": 25,
                })
            },
            SessionPhaseType::VideoDrill => {
                // Fetch video drills linked to this lesson or specified in settings
                let vd_col: Collection<crate::video_drill::models::VideoDrill> = db.collection("video_drills");
                let mut vd_filter = doc! { "lesson_id": lesson_oid };
                if let Some(specific_ids) = &phase.settings.specific_video_drill_ids {
                    if !specific_ids.is_empty() {
                        vd_filter = doc! { "_id": { "$in": specific_ids } };
                    }
                }
                let vd_cursor = vd_col.find(vd_filter).await?;
                let video_drills: Vec<crate::video_drill::models::VideoDrill> = vd_cursor.try_collect().await?;

                if video_drills.is_empty() {
                    eprintln!("[WARN] VideoDrill phase skipped: no drills found for lesson {}", lesson_id_str);
                    continue;
                }

                let drill_data: Vec<serde_json::Value> = video_drills.iter().map(|d| json!({
                    "id": d.id.map(|id| id.to_hex()),
                    "title": d.title,
                    "topic": d.topic,
                    "level": d.level,
                    "step_count": d.steps.len(),
                })).collect();

                json!({
                    "drills": drill_data,
                    "xp_reward": 15,
                })
            },
            // Catch-all: skip unknown / future phase types gracefully
            #[allow(unreachable_patterns)]
            _ => {
                eprintln!("[WARN] Unknown phase type {:?} skipped", phase.phase_type);
                continue;
            }
        };

        phase_data.push(json!({
            "type": phase.phase_type,
            "order": phase.order,
            "data": data,
        }));
    }

    // Final safety: if ALL phases were degraded/skipped, return a minimal Read-only session
    if phase_data.is_empty() {
        eprintln!("[ERROR] ALL phases skipped — returning minimal Read-only session for lesson {}", lesson_id_str);
        phase_data.push(json!({
            "type": SessionPhaseType::Read,
            "order": 0,
            "data": {
                "content": lesson.content,
                "content_id": lesson.content_id,
                "instruction": lesson.instruction,
                "culture_notes": lesson.culture_notes,
                "audio_url": lesson.audio_url,
                "video_url": lesson.video_url,
                "image_url": lesson.image_url,
                "xp_reward": 5,
            },
        }));
    }

    let response = json!({
        "lesson_id": lesson_id_str,
        "title": lesson.title,
        "title_id": lesson.title_id,
        "lives": lives,
        "xp_multiplier": xp_mult,
        "phases": phase_data,
    });

    Ok((StatusCode::OK, Json(response)))
}

// ==================== Admin: Level Template CRUD ====================

/// GET /admin/level-templates
pub async fn list_level_templates(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col: Collection<LevelTemplate> = db.collection("level_templates");
    let cursor = col.find(doc! {}).await?;
    let templates: Vec<LevelTemplate> = cursor.try_collect().await?;
    Ok(Json(templates))
}

/// GET /admin/level-templates/:level
pub async fn get_level_template(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(level): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col: Collection<LevelTemplate> = db.collection("level_templates");
    let template = col.find_one(doc! { "level": &level }).await?
        .ok_or(AppError::NotFound(format!("Template for level '{}' not found", level)))?;
    Ok(Json(template))
}

/// PUT /admin/level-templates/:level
pub async fn update_level_template(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(level): Path<String>,
    Json(payload): Json<UpdateLevelTemplateRequest>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col: Collection<LevelTemplate> = db.collection("level_templates");

    let mut update = doc! { "updated_at": mongodb::bson::DateTime::now() };
    if let Some(name) = payload.name {
        update.insert("name", name);
    }
    if let Some(phases) = payload.phases {
        let phases_bson = mongodb::bson::to_bson(&phases)
            .map_err(|_| AppError::BadRequest("Invalid phases data".into()))?;
        update.insert("phases", phases_bson);
    }
    if let Some(lives) = payload.default_lives {
        update.insert("default_lives", lives);
    }
    if let Some(mult) = payload.xp_multiplier {
        update.insert("xp_multiplier", mult);
    }

    col.update_one(doc! { "level": &level }, doc! { "$set": update }).await?;
    let updated = col.find_one(doc! { "level": &level }).await?
        .ok_or(AppError::NotFound("Template not found".into()))?;
    Ok(Json(updated))
}

// ==================== Admin: Lesson Session Config CRUD ====================

/// GET /admin/lesson-configs
pub async fn list_lesson_configs(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let col: Collection<LessonSessionConfig> = db.collection("lesson_session_configs");
    let cursor = col.find(doc! {}).await?;
    let configs: Vec<LessonSessionConfig> = cursor.try_collect().await?;
    Ok(Json(configs))
}

/// GET /admin/lesson-configs/:lesson_id
pub async fn get_lesson_config(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(lesson_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let oid = ObjectId::parse_str(&lesson_id)
        .map_err(|_| AppError::BadRequest("Invalid lesson ID".into()))?;
    let col: Collection<LessonSessionConfig> = db.collection("lesson_session_configs");
    let config = col.find_one(doc! { "lesson_id": oid }).await?
        .ok_or(AppError::NotFound("No session config for this lesson".into()))?;
    Ok(Json(config))
}

/// PUT /admin/lesson-configs/:lesson_id
pub async fn upsert_lesson_config(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(lesson_id): Path<String>,
    Json(payload): Json<UpsertLessonConfigRequest>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let oid = ObjectId::parse_str(&lesson_id)
        .map_err(|_| AppError::BadRequest("Invalid lesson ID".into()))?;
    let col: Collection<LessonSessionConfig> = db.collection("lesson_session_configs");

    let config_bson = mongodb::bson::to_bson(&LessonSessionConfig {
        id: None,
        lesson_id: oid,
        phases: payload.phases,
        override_lives: payload.override_lives,
        override_xp_multiplier: payload.override_xp_multiplier,
        pronunciation_sentences: payload.pronunciation_sentences,
        conversation_prompt: payload.conversation_prompt,
        branching_tree: payload.branching_tree,
        updated_at: Utc::now(),
    }).map_err(|_| AppError::BadRequest("Invalid config data".into()))?;

    let config_doc = config_bson.as_document()
        .ok_or(AppError::BadRequest("Failed to serialize config".into()))?;

    let result = col.update_one(
        doc! { "lesson_id": oid },
        doc! { "$set": config_doc },
    ).with_options(mongodb::options::UpdateOptions::builder().upsert(true).build()).await?;

    let result = col.find_one(doc! { "lesson_id": oid }).await?;
    Ok((StatusCode::OK, Json(result)))
}

/// DELETE /admin/lesson-configs/:lesson_id
pub async fn delete_lesson_config(
    State(state): State<Arc<AppState>>,
    _admin: Admin,
    Path(lesson_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let oid = ObjectId::parse_str(&lesson_id)
        .map_err(|_| AppError::BadRequest("Invalid lesson ID".into()))?;
    let col: Collection<LessonSessionConfig> = db.collection("lesson_session_configs");
    col.delete_one(doc! { "lesson_id": oid }).await?;
    Ok((StatusCode::OK, Json(json!({ "message": "Session config deleted, lesson will use level template" }))))
}

// ==================== Helpers ====================

/// Resolve the effective config by merging lesson override with level template.
fn resolve_config(
    lesson_config: &Option<LessonSessionConfig>,
    template: &Option<LevelTemplate>,
) -> (Vec<PhaseConfig>, i32, f64) {
    // Default phases if no template exists
    let default_phases = vec![
        PhaseConfig { phase_type: SessionPhaseType::Read, enabled: true, order: 0, settings: PhaseSettings::default() },
        PhaseConfig { phase_type: SessionPhaseType::Flashcard, enabled: true, order: 1, settings: PhaseSettings::default() },
        PhaseConfig { phase_type: SessionPhaseType::VocabDrill, enabled: true, order: 2, settings: PhaseSettings { drill_types: Some(vec!["matching".into()]), ..Default::default() } },
        PhaseConfig { phase_type: SessionPhaseType::Game, enabled: true, order: 3, settings: PhaseSettings::default() },
        PhaseConfig { phase_type: SessionPhaseType::Pronunciation, enabled: true, order: 4, settings: PhaseSettings { sentence_count: Some(3), min_accuracy_score: Some(60.0), speed: Some("normal".into()), ..Default::default() } },
        PhaseConfig { phase_type: SessionPhaseType::Conversation, enabled: true, order: 5, settings: PhaseSettings { turn_count: Some(3), ..Default::default() } },
    ];

    let (tmpl_phases, tmpl_lives, tmpl_mult) = match template {
        Some(t) => (t.phases.clone(), t.default_lives, t.xp_multiplier),
        None => (default_phases, 5, 1.0),
    };

    match lesson_config {
        Some(cfg) => {
            let phases = cfg.phases.clone().unwrap_or(tmpl_phases);
            let lives = cfg.override_lives.unwrap_or(tmpl_lives);
            let mult = cfg.override_xp_multiplier.unwrap_or(tmpl_mult);
            (phases, lives, mult)
        }
        None => (tmpl_phases, tmpl_lives, tmpl_mult),
    }
}

/// Build pronunciation sentences from config, or fall back to dialogue lines.
fn build_pronunciation_sentences(
    config: &Option<LessonSessionConfig>,
    dialogue: &Option<Dialogue>,
    _phases: &[PhaseConfig],
) -> Vec<String> {
    // Priority 1: lesson config custom sentences
    if let Some(cfg) = config {
        if let Some(sentences) = &cfg.pronunciation_sentences {
            if !sentences.is_empty() {
                return sentences.clone();
            }
        }
    }
    // Priority 2: extract from dialogue
    if let Some(d) = dialogue {
        return d.lines.iter().map(|l| l.text_en.clone()).collect();
    }
    // Fallback
    vec![]
}

/// Build conversation prompt from config or lesson context.
fn build_conversation_prompt(
    config: &Option<LessonSessionConfig>,
    lesson: &Lesson,
) -> String {
    if let Some(cfg) = config {
        if let Some(prompt) = &cfg.conversation_prompt {
            if !prompt.is_empty() {
                return prompt.clone();
            }
        }
    }
    format!(
        "You are an AI conversation partner. The student is practicing: {}. \
         Help them practice using vocabulary and phrases from this lesson about {}. \
         Respond naturally as a {}.",
        lesson.title,
        lesson.content.chars().take(200).collect::<String>(),
        match lesson.category {
            ContentCategory::Hotel => "hotel guest",
            ContentCategory::Restaurant => "restaurant customer",
            ContentCategory::Cruise => "cruise passenger",
            _ => "conversation partner",
        }
    )
}

/// Auto-generate vocabulary drills from the lesson's vocabulary list.
fn build_vocab_drills(vocabulary: &[Vocabulary], settings: &PhaseSettings) -> Vec<serde_json::Value> {
    let drill_types = settings.drill_types.clone()
        .unwrap_or_else(|| vec!["matching".into(), "fill_in_the_blank".into()]);
    let max_count = settings.max_drill_count.unwrap_or(3) as usize;
    let mut drills = Vec::new();

    for drill_type in drill_types.iter().take(max_count) {
        match drill_type.as_str() {
            "matching" => {
                let items: Vec<serde_json::Value> = vocabulary.iter().map(|v| {
                    json!({ "word": v.word, "match": v.translation })
                }).collect();
                if !items.is_empty() {
                    drills.push(json!({ "drill_type": "matching", "items": items }));
                }
            },
            "fill_in_the_blank" => {
                let items: Vec<serde_json::Value> = vocabulary.iter().filter_map(|v| {
                    let sentence = v.example_en.replace(&v.word, "___");
                    if sentence == v.example_en { return None; }
                    // Build simple distractors from other words
                    let distractors: Vec<String> = vocabulary.iter()
                        .filter(|other| other.word != v.word)
                        .take(3)
                        .map(|other| other.word.clone())
                        .collect();
                    let mut options = vec![v.word.clone()];
                    options.extend(distractors);
                    Some(json!({
                        "sentence": sentence,
                        "answer": v.word,
                        "options": options,
                    }))
                }).collect();
                if !items.is_empty() {
                    drills.push(json!({ "drill_type": "fill_in_the_blank", "items": items }));
                }
            },
            "word_scramble" => {
                let items: Vec<serde_json::Value> = vocabulary.iter().map(|v| {
                    json!({ "word": v.word.to_uppercase(), "hint": v.translation })
                }).collect();
                if !items.is_empty() {
                    drills.push(json!({ "drill_type": "word_scramble", "items": items }));
                }
            },
            _ => {}
        }
    }

    drills
}
