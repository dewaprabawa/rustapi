use rustapi::create_app;
use dotenvy::dotenv;
use std::env;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    
    let app = create_app().await;

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await.unwrap();
    println!("Server running on http://localhost:{}", port);
    axum::serve(listener, app).await.unwrap();
}
