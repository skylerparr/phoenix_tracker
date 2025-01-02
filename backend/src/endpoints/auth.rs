use crate::crud::token::TokenCrud;
use crate::crud::user::UserCrud;
use crate::crud::user_setting::UserSettingCrud;
use crate::AppState;
use axum::body::Body;
use axum::http::StatusCode;
use axum::response::Response;
use axum::{
    extract::{Json, State},
    response::IntoResponse,
    routing::post,
    Router,
};
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    email: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterRequest {
    name: String,
    email: String,
}

pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/register", post(register))
        .route("/auth/logout", post(logout))
}
#[axum::debug_handler]
async fn login(
    State(app_state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(app_state.db.clone());
    let token_crud = TokenCrud::new(app_state.db.clone());

    let user = match user_crud.find_by_email(payload.email).await {
        Ok(Some(user)) => user,
        Ok(None) => return (StatusCode::NOT_FOUND, "User not found").into_response(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response(),
    };

    create_token(app_state, user.id).await
}
#[axum::debug_handler]
async fn register(
    State(app_state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(app_state.db.clone());
    let token_crud = TokenCrud::new(app_state.db.clone());

    let user = match user_crud.create(payload.name, payload.email).await {
        Ok(user) => user,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create user").into_response()
        }
    };

    create_token(app_state, user.id).await
}

async fn create_token(app_state: AppState, user_id: i32) -> Response<Body> {
    let token_crud = TokenCrud::new(app_state.db.clone());

    let expires_at = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .unwrap()
        .into();

    let user_setting_crud = UserSettingCrud::new(app_state.db.clone());
    let project_id = user_setting_crud
        .find_by_user_id(user_id)
        .await
        .map(|settings| settings.project_id)
        .unwrap_or(None);

    match token_crud.create(user_id, expires_at).await {
        Ok(token) => Json(json!({
            "user_id": user_id,
            "token": token.token,
            "expires_at": token.expires_at,
            "project_id": project_id
        }))
        .into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create token").into_response(),
    }
}
#[axum::debug_handler]
async fn logout(
    State(mut app_state): State<AppState>,
    Json(payload): Json<LogoutRequest>,
) -> impl IntoResponse {
    let token_crud = TokenCrud::new(app_state.db.clone());
    match token_crud.delete_by_user_id(payload.user_id).await {
        Ok(_) => {
            app_state.user = None;
            StatusCode::OK.into_response()
        }
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

#[derive(Deserialize)]
struct LogoutRequest {
    user_id: i32,
}
