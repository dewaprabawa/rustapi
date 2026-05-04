use mongodb::{Client, bson::doc};
use chrono::Utc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::with_uri_str("mongodb+srv://dewas2026:BpYSmzZhJ8EKVqVs@cluster0.ofnyeuk.mongodb.net/rustapi").await?;
    let db = client.database("rustapi");
    let col = db.collection::<mongodb::bson::Document>("llm_api_keys");

    let new_key = doc! {
        "provider": "aicc",
        "name": "AICC Mistral Key",
        "api_key": "sk-qJq6ZH8lYIvQiXyrawOaRW4JrAkCyzrHjHamTkqWwRFxV0Fr",
        "is_active": true,
        "created_at": Utc::now()
    };

    col.insert_one(new_key).await?;
    println!("✅ AICC API Key added and activated!");

    Ok(())
}
