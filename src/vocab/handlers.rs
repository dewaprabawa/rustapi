use axum::{
    extract::{State, Json},
    response::IntoResponse,
    http::StatusCode,
};
use mongodb::bson::{doc, oid::ObjectId};
use std::sync::Arc;
use futures::stream::StreamExt;

use crate::handlers::{AppState, AppError};
use crate::ai::models::GeneratedVocabPreview;




#[derive(Debug, serde::Deserialize)]
pub struct SaveVocabRequest {
    pub preview: GeneratedVocabPreview,
    pub level: String,
    pub language: String,
    pub topic: String,
    pub set_type: Option<String>,
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
            example_sentence: w.example_sentence,
            distractors: w.distractors,
            item_dialogue: w.item_dialogue.map(|lines| lines.into_iter().map(|l| crate::vocab::models::VocabDialogueLine {
                speaker: l.speaker,
                text_en: l.text_en,
                text_id: l.text_id,
            }).collect()),
            audio_url: None,
            position: i as i32,
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
