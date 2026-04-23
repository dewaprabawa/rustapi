use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey};
use serde::{Serialize, Deserialize};
use chrono::{Utc, Duration};
use bcrypt::{hash, verify, DEFAULT_COST};
// // use crate::models::User; // Removed unused import

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user_id or admin_id
    pub role: String, // "user" or "admin"
    pub exp: usize,
}

pub fn hash_password(password: &str) -> String {
    hash(password, DEFAULT_COST).expect("Failed to hash password")
}

pub fn verify_password(password: &str, hashed: &str) -> bool {
    verify(password, hashed).expect("Failed to verify password")
}

pub fn create_jwt(user_id: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    create_jwt_with_role(user_id, "user", secret)
}

pub fn create_admin_jwt(admin_id: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    create_jwt_with_role(admin_id, "admin", secret)
}

fn create_jwt_with_role(sub: &str, role: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::days(7))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: sub.to_owned(),
        role: role.to_owned(),
        exp: expiration as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
}

pub fn decode_jwt(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;
    
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &validation,
    )?;

    Ok(token_data.claims)
}
