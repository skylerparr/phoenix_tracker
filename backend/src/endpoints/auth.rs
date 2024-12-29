use crate::crud::token::TokenCrud;
use crate::crud::user::UserCrud;
use axum::http::StatusCode;
use axum::{
    extract::{Json, State},
    response::IntoResponse,
    routing::post,
    Router,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct LoginRequest {
    email: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    name: String,
    email: String,
}

pub fn auth_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/register", post(register))
        .route("/auth/logout", post(logout))
}
#[axum::debug_handler]
async fn login(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(db.clone());
    let token_crud = TokenCrud::new(db);

    let user = match user_crud.find_by_email(payload.email).await {
        Ok(Some(user)) => user,
        Ok(None) => return (StatusCode::NOT_FOUND, "User not found").into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response(),
    };

    let expires_at = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .unwrap()
        .into();

    match token_crud.create(user.id, expires_at).await {
        Ok(token) => Json(json!({
            "token": token.token,
            "expires_at": token.expires_at
        }))
        .into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create token").into_response(),
    }
}
#[axum::debug_handler]
async fn register(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(db.clone());
    let token_crud = TokenCrud::new(db);

    let user = match user_crud.create(payload.name, payload.email).await {
        Ok(user) => user,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create user").into_response()
        }
    };

    let expires_at = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .unwrap()
        .into();

    match token_crud.create(user.id, expires_at).await {
        Ok(token) => Json(json!({
            "token": token.token,
            "expires_at": token.expires_at
        }))
        .into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create token").into_response(),
    }
}

#[axum::debug_handler]
async fn logout(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<LogoutRequest>,
) -> impl IntoResponse {
    let token_crud = TokenCrud::new(db);
    match token_crud.delete_by_user_id(payload.user_id).await {
        Ok(_) => StatusCode::OK.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

#[derive(Deserialize)]
struct LogoutRequest {
    user_id: i32,
}