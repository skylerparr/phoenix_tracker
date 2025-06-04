use crate::crud::user::UserCrud;
use crate::jwt::JwtService;
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
use tracing::debug;

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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchProjectRequest {
    project_id: i32,
}

pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/register", post(register))
        .route("/auth/logout", post(logout))
        .route("/auth/switch-project", post(switch_project))
}
#[axum::debug_handler]
async fn login(
    State(app_state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(app_state.clone());

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
    let user_crud = UserCrud::new(app_state.clone());

    let user = match user_crud.create(payload.name, payload.email).await {
        Ok(user) => user,
        Err(e) => {
            debug!("Error creating user: {:?}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create user").into_response();
        }
    };

    create_token(app_state, user.id).await
}

async fn create_token(_app_state: AppState, user_id: i32) -> Response<Body> {
    debug!("Creating JWT service instance");
    let jwt_service = JwtService::new();

    debug!(
        "Creating JWT token for user ID: {} with no initial project",
        user_id
    );
    // Users start with no project selected - they must choose one using switch-project
    let project_id = None;

    match jwt_service.create_token(user_id, project_id) {
        Ok(token) => {
            debug!("JWT token created successfully for user: {}", user_id);
            let expires_at = chrono::Utc::now()
                .checked_add_signed(chrono::Duration::days(7))
                .unwrap();

            Json(json!({
                "user_id": user_id,
                "token": format!("Bearer {}", token),
                "expires_at": expires_at,
                "project_id": project_id
            }))
            .into_response()
        }
        Err(e) => {
            debug!(
                "Failed to create JWT token for user ID: {}, error: {:?}",
                user_id, e
            );
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create token").into_response()
        }
    }
}
#[axum::debug_handler]
async fn logout(
    State(mut app_state): State<AppState>,
    Json(_payload): Json<LogoutRequest>,
) -> impl IntoResponse {
    // With JWT tokens, logout is handled client-side by removing the token
    // No server-side cleanup needed since tokens are stateless
    app_state.user = None;
    StatusCode::OK.into_response()
}

#[axum::debug_handler]
async fn switch_project(
    State(_app_state): State<AppState>,
    req: axum::extract::Request<axum::body::Body>,
) -> impl IntoResponse {
    // Extract headers before consuming the body
    let auth_header = req
        .headers()
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .map(|s| s.to_string()); // Clone the header value

    // Extract the JSON payload from the request body
    let body_bytes = match axum::body::to_bytes(req.into_body(), usize::MAX).await {
        Ok(bytes) => bytes,
        Err(_) => return (StatusCode::BAD_REQUEST, "Failed to read request body").into_response(),
    };

    let payload: SwitchProjectRequest = match serde_json::from_slice(&body_bytes) {
        Ok(payload) => payload,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid JSON payload").into_response(),
    };

    if let Some(auth_header_value) = auth_header {
        if let Some(token) = JwtService::extract_bearer_token(&auth_header_value) {
            let jwt_service = JwtService::new();
            match jwt_service.validate_token(token) {
                Ok(claims) => {
                    create_token_with_project(claims.user_id, Some(payload.project_id)).await
                }
                Err(_) => (StatusCode::UNAUTHORIZED, "Invalid token").into_response(),
            }
        } else {
            (
                StatusCode::UNAUTHORIZED,
                "Invalid authorization header format",
            )
                .into_response()
        }
    } else {
        (StatusCode::UNAUTHORIZED, "No authorization token provided").into_response()
    }
}

async fn create_token_with_project(user_id: i32, project_id: Option<i32>) -> Response<Body> {
    debug!("Creating JWT service instance");
    let jwt_service = JwtService::new();

    debug!(
        "Creating JWT token for user ID: {} with project ID: {:?}",
        user_id, project_id
    );
    match jwt_service.create_token(user_id, project_id) {
        Ok(token) => {
            debug!(
                "JWT token created successfully for user: {} with project: {:?}",
                user_id, project_id
            );
            let expires_at = chrono::Utc::now()
                .checked_add_signed(chrono::Duration::days(7))
                .unwrap();

            Json(json!({
                "user_id": user_id,
                "token": format!("Bearer {}", token),
                "expires_at": expires_at,
                "project_id": project_id
            }))
            .into_response()
        }
        Err(e) => {
            debug!(
                "Failed to create JWT token for user ID: {}, error: {:?}",
                user_id, e
            );
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create token").into_response()
        }
    }
}

#[derive(Deserialize)]
struct LogoutRequest {}
