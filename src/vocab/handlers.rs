use axum::{
    extract::{State, Json},
    response::IntoResponse,
    http::StatusCode,
};
use mongodb::bson::{doc, oid::ObjectId};
use std::sync::Arc;
use futures::stream::{StreamExt, TryStreamExt};

use crate::handlers::{AppState, AppError};
use crate::ai::models::GeneratedVocabPreview;




#[derive(Debug, serde::Deserialize)]
pub struct SaveVocabRequest {
    pub preview: GeneratedVocabPreview,
    pub level: String,
    pub language: String,
    pub topic: String,
    pub set_type: Option<String>,
    pub group_id: Option<String>, // New: link to a group
}

pub async fn save_vocab_set(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SaveVocabRequest>,
) -> Result<impl IntoResponse, AppError> {
    let db = state.db.database("rustapi");
    let sets_col = db.collection::<crate::vocab::models::VocabSet>("vocab_sets");
    let words_col = db.collection::<crate::vocab::models::VocabWord>("vocab_words");

    let now = mongodb::bson::DateTime::now();

    // 1. Create the VocabSet
    let new_set = crate::vocab::models::VocabSet {
        id: None,
        title: payload.preview.title,
        topic: payload.topic,
        level: payload.level,
        language: payload.language,
        word_count: payload.preview.words.len() as i32,
        game_types: vec!["flashcard".to_string(), "mcq".to_string(), "matching".to_string(), "fill".to_string()],
        related_topics: payload.preview.related_topics,
        status: "published".to_string(),
        created_by: "admin".to_string(),
        set_type: payload.set_type.unwrap_or_else(|| "vocabulary".to_string()),
        published_at: Some(now),
        created_at: Some(now),
        updated_at: Some(now),
        example_dialogue: Some(payload.preview.dialogue.into_iter().map(|d| crate::vocab::models::VocabDialogueLine {
            speaker: d.speaker,
            text_en: d.text_en,
            text_id: d.text_id,
        }).collect()),
        branching_tree: payload.preview.branching_tree,
        group_id: payload.group_id.and_then(|id| ObjectId::parse_str(&id).ok()),
    };

    let set_result = sets_col.insert_one(new_set).await?;
    let set_id = set_result.inserted_id.as_object_id().unwrap();

    // 2. Create the VocabWords
    let mut words = Vec::new();
    for (i, w) in payload.preview.words.into_iter().enumerate() {
        words.push(crate::vocab::models::VocabWord {
            id: None,
            set_id,
            word: w.word,
            translation: w.translation,
            part_of_speech: w.part_of_speech,
            definition: w.definition,
            pronunciation_guide: w.pronunciation_guide,
            colloquial_usage: w.colloquial_usage,
            colloquial_usage_id: Some(w.colloquial_usage_id),
            example_sentence: w.example_sentence,
            distractors: w.distractors,
            item_dialogue: w.item_dialogue.map(|lines| lines.into_iter().map(|l| crate::vocab::models::VocabDialogueLine {
                speaker: l.speaker,
                text_en: l.text_en,
                text_id: l.text_id,
            }).collect()),
            audio_url: None,
            position: i as i32,
            card_type: w.card_type.unwrap_or_else(|| "vocabulary".to_string()),
            emoji: w.emoji,
            emotion: w.emotion,
        });
    }

    words_col.insert_many(words).await?;

    Ok(StatusCode::CREATED)
}

#[derive(Debug, serde::Deserialize)]
pub struct ListVocabParams {
    pub set_type: Option<String>,
}

pub async fn list_vocab_sets(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(params): axum::extract::Query<ListVocabParams>,
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.database("rustapi").collection::<crate::vocab::models::VocabSet>("vocab_sets");
    
    let mut filter = doc! {};
    if let Some(t) = params.set_type {
        filter.insert("set_type", t);
    }

    let mut cursor = collection.find(filter).await?;
    
    let mut sets = Vec::new();
    while let Some(set) = cursor.next().await {
        sets.push(set?);
    }
    
    Ok(Json(sets))
}

pub async fn get_vocab_words(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(set_id): axum::extract::Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&set_id).map_err(|_| AppError::BadRequest("Invalid set ID".to_string()))?;
    let collection = state.db.database("rustapi").collection::<crate::vocab::models::VocabWord>("vocab_words");
    
    let mut cursor = collection.find(doc! { "set_id": oid }).await?;
    
    let mut words = Vec::new();
    while let Some(word) = cursor.next().await {
        words.push(word?);
    }
    
    Ok(Json(words))
}

pub async fn delete_vocab_set(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid set ID".to_string()))?;
    let db = state.db.database("rustapi");
    let sets_col = db.collection::<crate::vocab::models::VocabSet>("vocab_sets");
    let words_col = db.collection::<crate::vocab::models::VocabWord>("vocab_words");

    // 1. Delete associated words
    words_col.delete_many(doc! { "set_id": oid }).await?;

    // 2. Delete the set itself
    let result = sets_col.delete_one(doc! { "_id": oid }).await?;

    if result.deleted_count == 0 {
        return Err(AppError::NotFound("Not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_vocab_word(
    State(state): State<Arc<AppState>>,
    axum::extract::Path((_set_id, word_id)): axum::extract::Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let word_oid = ObjectId::parse_str(&word_id).map_err(|_| AppError::BadRequest("Invalid word ID".to_string()))?;
    
    let db = state.db.database("rustapi");
    let sets_col = db.collection::<crate::vocab::models::VocabSet>("vocab_sets");
    let words_col = db.collection::<crate::vocab::models::VocabWord>("vocab_words");

    // 1. Get the word to find its set_id
    let word = words_col.find_one(doc! { "_id": word_oid }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))?;

    // 2. Delete the word
    let result = words_col.delete_one(doc! { "_id": word_oid }).await?;

    if result.deleted_count > 0 {
        // 3. Decrement word_count in VocabSet
        sets_col.update_one(
            doc! { "_id": word.set_id },
            doc! { "$inc": { "word_count": -1 } }
        ).await?;
    }

    Ok(StatusCode::NO_CONTENT)
}


pub async fn update_vocab_set(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<crate::vocab::models::UpdateVocabSetRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid set ID".to_string()))?;
    let collection = state.db.database("rustapi").collection::<crate::vocab::models::VocabSet>("vocab_sets");

    let mut update_doc = doc! { "updated_at": mongodb::bson::DateTime::now() };
    if let Some(v) = payload.title { update_doc.insert("title", v); }
    if let Some(v) = payload.topic { update_doc.insert("topic", v); }
    if let Some(v) = payload.level { update_doc.insert("level", v); }
    if let Some(v) = payload.status { update_doc.insert("status", v); }
    if let Some(v) = payload.related_topics { update_doc.insert("related_topics", v); }
    if let Some(v) = payload.example_dialogue { 
        update_doc.insert("example_dialogue", mongodb::bson::to_bson(&v).unwrap()); 
    }
    if let Some(v) = payload.branching_tree { 
        update_doc.insert("branching_tree", mongodb::bson::to_bson(&v).unwrap()); 
    }

    collection.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }).await?;
    Ok(StatusCode::OK)
}

pub async fn update_vocab_word(
    State(state): State<Arc<AppState>>,
    axum::extract::Path((_set_id, word_id)): axum::extract::Path<(String, String)>,
    Json(payload): Json<crate::vocab::models::UpdateVocabWordRequest>,
) -> Result<impl IntoResponse, AppError> {
    let word_oid = ObjectId::parse_str(&word_id).map_err(|_| AppError::BadRequest("Invalid word ID".to_string()))?;
    let collection = state.db.database("rustapi").collection::<crate::vocab::models::VocabWord>("vocab_words");

    let mut update_doc = doc! {};
    if let Some(v) = payload.word { update_doc.insert("word", v); }
    if let Some(v) = payload.translation { update_doc.insert("translation", v); }
    if let Some(v) = payload.part_of_speech { update_doc.insert("part_of_speech", v); }
    if let Some(v) = payload.definition { update_doc.insert("definition", v); }
    if let Some(v) = payload.pronunciation_guide { update_doc.insert("pronunciation_guide", v); }
    if let Some(v) = payload.colloquial_usage { update_doc.insert("colloquial_usage", v); }
    if let Some(v) = payload.colloquial_usage_id { update_doc.insert("colloquial_usage_id", v); }
    if let Some(v) = payload.example_sentence { update_doc.insert("example_sentence", v); }
    if let Some(v) = payload.distractors { update_doc.insert("distractors", v); }
    if let Some(v) = payload.item_dialogue { 
        update_doc.insert("item_dialogue", mongodb::bson::to_bson(&v).unwrap()); 
    }
    if let Some(v) = payload.card_type { update_doc.insert("card_type", v); }
    if let Some(v) = payload.emoji { update_doc.insert("emoji", v); }
    if let Some(v) = payload.emotion { update_doc.insert("emotion", v); }

    collection.update_one(doc! { "_id": word_oid }, doc! { "$set": update_doc }).await?;
    Ok(StatusCode::OK)
}

// ============ VocabGroup Handlers ============

pub async fn list_vocab_groups(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.database("rustapi").collection::<crate::vocab::models::VocabGroup>("vocab_groups");
    let mut cursor = collection.find(doc! {}).await?;
    let mut groups = Vec::new();
    while let Some(group) = cursor.next().await {
        groups.push(group?);
    }
    Ok(Json(groups))
}

pub async fn get_vocab_group(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;
    let collection = state.db.database("rustapi").collection::<crate::vocab::models::VocabGroup>("vocab_groups");
    let group = collection.find_one(doc! { "_id": oid }).await?
        .ok_or(AppError::NotFound("Not found".to_string()))?;
    Ok(Json(group))
}

#[derive(Debug, serde::Deserialize)]
pub struct CreateVocabGroupRequest {
    pub title: String,
    pub description: String,
    pub topic: String,
    pub level: String,
    pub pos_type: Option<String>,
    pub color_theme: Option<String>,
    pub icon: Option<String>,
}

pub async fn create_vocab_group(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateVocabGroupRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.database("rustapi").collection::<crate::vocab::models::VocabGroup>("vocab_groups");
    let new_group = crate::vocab::models::VocabGroup {
        id: None,
        title: payload.title,
        description: payload.description,
        topic: payload.topic,
        level: payload.level,
        pos_type: payload.pos_type,
        color_theme: payload.color_theme.unwrap_or_else(|| "#6366F1".to_string()),
        icon: payload.icon.unwrap_or_else(|| "Folder".to_string()),
        created_at: chrono::Utc::now(),
    };
    let result = collection.insert_one(new_group).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({ "id": result.inserted_id.as_object_id().unwrap().to_hex() }))))
}

#[derive(Debug, serde::Deserialize)]
pub struct UpdateVocabGroupRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub topic: Option<String>,
    pub level: Option<String>,
    pub pos_type: Option<String>,
    pub color_theme: Option<String>,
    pub icon: Option<String>,
}

pub async fn update_vocab_group(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<UpdateVocabGroupRequest>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;
    let collection = state.db.database("rustapi").collection::<crate::vocab::models::VocabGroup>("vocab_groups");

    let mut update_doc = doc! {};
    if let Some(v) = payload.title { update_doc.insert("title", v); }
    if let Some(v) = payload.description { update_doc.insert("description", v); }
    if let Some(v) = payload.topic { update_doc.insert("topic", v); }
    if let Some(v) = payload.level { update_doc.insert("level", v); }
    if let Some(v) = payload.pos_type { update_doc.insert("pos_type", v); }
    if let Some(v) = payload.color_theme { update_doc.insert("color_theme", v); }
    if let Some(v) = payload.icon { update_doc.insert("icon", v); }

    collection.update_one(doc! { "_id": oid }, doc! { "$set": update_doc }).await?;
    Ok(StatusCode::OK)
}

pub async fn delete_vocab_group(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;
    let db = state.db.database("rustapi");
    let groups_col = db.collection::<crate::vocab::models::VocabGroup>("vocab_groups");
    let sets_col = db.collection::<crate::vocab::models::VocabSet>("vocab_sets");

    // 1. Unlink sets from this group (don't delete the sets, just set group_id to null)
    sets_col.update_many(
        doc! { "group_id": oid },
        doc! { "$set": { "group_id": null } }
    ).await?;

    // 2. Delete the group
    let result = groups_col.delete_one(doc! { "_id": oid }).await?;

    if result.deleted_count == 0 {
        return Err(AppError::NotFound("Not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_vocab_group_words(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid group ID".to_string()))?;
    let db = state.db.database("rustapi");
    
    // 1. Get all sets for this group
    let sets_col = db.collection::<crate::vocab::models::VocabSet>("vocab_sets");
    let mut sets_cursor = sets_col.find(doc! { "group_id": oid }).await?;
    let mut set_ids = Vec::new();
    while let Some(set) = sets_cursor.try_next().await? {
        if let Some(set_id) = set.id {
            set_ids.push(set_id);
        }
    }

    // 2. Get all words for these sets
    let words_col = db.collection::<crate::vocab::models::VocabWord>("vocab_words");
    let mut words_cursor = words_col.find(doc! { "set_id": { "$in": set_ids } }).await?;
    let mut words = Vec::new();
    while let Some(word) = words_cursor.try_next().await? {
        words.push(word);
    }

    Ok(Json(words))
}
