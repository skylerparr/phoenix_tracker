use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use crate::environment;

const TOKEN_EXPIRATION_DAYS: i64 = 7;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub user_id: i32,
    pub project_id: Option<i32>,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug)]
pub enum JwtError {
    InvalidToken,
    ExpiredToken,
    EncodingError,
}

impl std::fmt::Display for JwtError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JwtError::InvalidToken => write!(f, "Invalid token"),
            JwtError::ExpiredToken => write!(f, "Token has expired"),
            JwtError::EncodingError => write!(f, "Failed to encode token"),
        }
    }
}

impl std::error::Error for JwtError {}

pub struct JwtService;

impl JwtService {
    /// Create a new instance
    pub fn new() -> Self {
        Self
    }

    /// Get the JWT secret from centralized environment
    fn get_secret() -> String {
        environment::jwt_secret().to_string()
    }

    /// Create a new JWT token with user_id and optional project_id
    pub fn create_token(&self, user_id: i32, project_id: Option<i32>) -> Result<String, JwtError> {
        let now = Utc::now();
        let expiration = now + Duration::days(TOKEN_EXPIRATION_DAYS);

        let claims = Claims {
            user_id,
            project_id,
            exp: expiration.timestamp() as usize,
            iat: now.timestamp() as usize,
        };

        let secret = Self::get_secret();
        let encoding_key = EncodingKey::from_secret(secret.as_ref());

        encode(&Header::default(), &claims, &encoding_key).map_err(|_| JwtError::EncodingError)
    }

    /// Validate and decode a JWT token
    pub fn validate_token(&self, token: &str) -> Result<Claims, JwtError> {
        let secret = Self::get_secret();
        let decoding_key = DecodingKey::from_secret(secret.as_ref());

        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;

        decode::<Claims>(token, &decoding_key, &validation)
            .map(|token_data| token_data.claims)
            .map_err(|err| match err.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => JwtError::ExpiredToken,
                _ => JwtError::InvalidToken,
            })
    }

    /// Extract bearer token from Authorization header (alias for compatibility)
    pub fn extract_bearer_token(auth_header: &str) -> Option<&str> {
        if auth_header.starts_with("Bearer ") {
            Some(&auth_header[7..])
        } else {
            // Accept raw JWT tokens without the "Bearer " prefix as well
            // Heuristic: JWTs have three segments separated by dots
            if auth_header.split('.').count() == 3 {
                Some(auth_header)
            } else {
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_creation_and_validation() {
        let user_id = 123;
        let project_id = Some(456);
        let jwt_service = JwtService::new();

        // Create token
        let token = jwt_service.create_token(user_id, project_id).unwrap();
        assert!(!token.is_empty());

        // Validate token
        let claims = jwt_service.validate_token(&token).unwrap();
        assert_eq!(claims.user_id, user_id);
        assert_eq!(claims.project_id, project_id);
    }

    #[test]
    fn test_bearer_token_extraction() {
        let token_with_bearer = "Bearer abc123";

        assert_eq!(
            JwtService::extract_bearer_token(token_with_bearer),
            Some("abc123")
        );
        assert_eq!(JwtService::extract_bearer_token("abc123"), None);
    }
}
