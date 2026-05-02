#[tokio::main]
async fn main() {
    let client = mongodb::Client::with_uri_str("mongodb://localhost:27017").await.unwrap();
    let db = client.database("rustapi");
    db.collection::<mongodb::bson::Document>("progress").delete_many(mongodb::bson::doc! {}).await.unwrap();
    db.collection::<mongodb::bson::Document>("game_sessions").delete_many(mongodb::bson::doc! {}).await.unwrap();
    println!("Database wiped!");
}
