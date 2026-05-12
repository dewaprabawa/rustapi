use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use mongodb::{bson::{doc, oid::ObjectId}, Collection};
use std::sync::Arc;
use crate::handlers::{AppState, AppError};
use crate::ebook::models::{Book, Ebook, CurriculumStage, UploadBookRequest, GenerateEbookRequest, EbookConfig, UpdateEbookRequest};
use chrono::Utc;

// ============ Book Handlers ============

pub async fn upload_book(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UploadBookRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Book> = state.db.database("rustapi").collection("books");

    let new_book = Book {
        id: None,
        title: payload.title,
        file_path: "".to_string(), // In a real app, we'd handle file upload to S3/Supabase
        status: payload.status.unwrap_or_else(|| "pending".to_string()),
        profile: None,
        created_at: Utc::now(),
    };

    let result = collection.insert_one(new_book).await?;
    let inserted_id = result.inserted_id.as_object_id().unwrap();

    Ok((StatusCode::CREATED, Json(doc! { "id": inserted_id.to_hex() })))
}

pub async fn list_books(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Book> = state.db.database("rustapi").collection("books");
    let mut cursor = collection.find(doc! {}).await?;
    let mut books = Vec::new();
    while cursor.advance().await? {
        books.push(cursor.deserialize_current()?);
    }
    Ok(Json(books))
}

// ============ Ebook Handlers ============

pub async fn generate_ebook(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<GenerateEbookRequest>,
) -> Result<impl IntoResponse, AppError> {
    let ebooks_coll: Collection<Ebook> = state.db.database("rustapi").collection("ebooks");
    let books_coll: Collection<Book> = state.db.database("rustapi").collection("books");

    let reference_book_id = payload.reference_book_id
        .map(|id| ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid book ID".to_string())))
        .transpose()?;

    // Optional: Fetch book profile if reference_book_id is provided
    let _book_profile = if let Some(ref_id) = reference_book_id {
        books_coll.find_one(doc! { "_id": ref_id }).await?
    } else {
        None
    };

    // In a real implementation, we would call an LLM service here with the book profile
    // to generate the actual lesson content.
    let mock_lessons = vec![
        serde_json::json!({
            "lesson_number": 1,
            "title": "Welcome & Warm Up",
            "content": "Sample content generated using style from reference book..."
        })
    ];

    let new_ebook = Ebook {
        id: None,
        title: format!("Ebook - Stage {} Course {}", payload.stage, payload.course),
        config: EbookConfig {
            stage: payload.stage,
            course: payload.course,
            module: payload.module,
            lessons: payload.lessons,
            level: payload.level,
            reference_book_id,
        },
        lessons: mock_lessons,
        status: "draft".to_string(),
        created_at: Utc::now(),
    };

    let result = ebooks_coll.insert_one(new_ebook).await?;
    let inserted_id = result.inserted_id.as_object_id().unwrap();

    Ok((StatusCode::CREATED, Json(doc! { "id": inserted_id.to_hex(), "lessons": new_ebook.lessons })))
}

pub async fn get_ebook(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Ebook> = state.db.database("rustapi").collection("ebooks");
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;
    
    let ebook = collection.find_one(doc! { "_id": oid }).await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(ebook))
}

pub async fn update_ebook(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpdateEbookRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<Ebook> = state.db.database("rustapi").collection("ebooks");
    let oid = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest("Invalid ID".to_string()))?;

    let mut update_doc = doc! {};
    if let Some(lessons) = payload.lessons {
        update_doc.insert("lessons", mongodb::bson::to_bson(&lessons).map_err(|_| AppError::Internal("BSON conversion failed".to_string()))?);
    }
    if let Some(status) = payload.status {
        update_doc.insert("status", status);
    }

    collection.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc }
    ).await?;

    Ok(StatusCode::OK)
}

pub async fn export_ebook(
    Path(id): Path<String>,
    State(_state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    // In a real implementation, this would render HTML to PDF (e.g., using headless chrome or a PDF lib)
    Ok(Json(doc! { 
        "message": "Ebook export initiated",
        "ebook_id": id.clone(),
        "download_url": format!("/downloads/ebook_{}.pdf", id) 
    }))
}

// ============ Curriculum Handlers ============

pub async fn get_curriculum(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let collection: Collection<CurriculumStage> = state.db.database("rustapi").collection("curriculum");
    let mut cursor = collection.find(doc! {}).await?;
    let mut stages = Vec::new();
    while cursor.advance().await? {
        stages.push(cursor.deserialize_current()?);
    }
    Ok(Json(stages))
}
