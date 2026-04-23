use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
};
use mongodb::{Collection, bson::doc};
use crate::models::User;
use crate::handlers::{AppState, AppError};
use crate::auth::decode_jwt;
use std::sync::Arc;
use bson::oid::ObjectId;

#[async_trait]
impl FromRequestParts<Arc<AppState>> for User {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &Arc<AppState>) -> Result<Self, Self::Rejection> {
        // Extract the Authorization header manually
        let auth_header = parts.headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .filter(|h| h.starts_with("Bearer "))
            .ok_or(AppError::InvalidCredentials)?;

        let token = &auth_header[7..]; // Skip "Bearer "

        let claims = decode_jwt(token, &state.jwt_secret)
            .map_err(|_| AppError::InvalidCredentials)?;

        let user_id = ObjectId::parse_str(&claims.sub)
            .map_err(|_| AppError::InvalidCredentials)?;

        let collection: Collection<User> = state.db.database("rustapi").collection("users");
        
        let user = collection.find_one(doc! { "_id": user_id }).await?
            .ok_or(AppError::InvalidCredentials)?;

        Ok(user)
    }
}
