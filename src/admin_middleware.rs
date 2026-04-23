use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
};
use mongodb::{Collection, bson::doc};
use crate::models::Admin;
use crate::handlers::{AppState, AppError};
use crate::auth::decode_jwt;
use std::sync::Arc;
use bson::oid::ObjectId;

/// Axum extractor that validates the JWT has role="admin" and loads the Admin from DB.
/// Use this as a handler parameter to protect admin-only routes.
#[async_trait]
impl FromRequestParts<Arc<AppState>> for Admin {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &Arc<AppState>) -> Result<Self, Self::Rejection> {
        // 1. Extract Authorization header
        let auth_header = parts.headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .filter(|h| h.starts_with("Bearer "))
            .ok_or(AppError::InvalidCredentials)?;

        let token = &auth_header[7..];

        // 2. Decode JWT and verify role
        let claims = decode_jwt(token, &state.jwt_secret)
            .map_err(|_| AppError::InvalidCredentials)?;

        if claims.role != "admin" {
            return Err(AppError::Forbidden);
        }

        // 3. Load admin from database
        let admin_id = ObjectId::parse_str(&claims.sub)
            .map_err(|_| AppError::InvalidCredentials)?;

        let collection: Collection<Admin> = state.db.database("rustapi").collection("admins");

        let admin = collection.find_one(doc! { "_id": admin_id }).await?
            .ok_or(AppError::InvalidCredentials)?;

        if !admin.is_active {
            return Err(AppError::Forbidden);
        }

        Ok(admin)
    }
}
