use crate::crud::comment::CommentCrud;
use crate::AppState;
use axum::Extension;
use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use tracing::debug;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCommentRequest {
    content: String,
    issue_id: i32,
}

pub fn comment_routes() -> Router<AppState> {
    Router::new()
        .route("/comments", post(create_comment))
        .route("/comments/:id", get(get_comment))
        .route("/comments/issue/:id", get(get_comments_by_issue))
        .route("/comments/user/:id", get(get_comments_by_user))
}

#[axum::debug_handler]
async fn create_comment(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateCommentRequest>,
) -> impl IntoResponse {
    let user_id = app_state.user.as_ref().unwrap().id;
    let comment_crud = CommentCrud::new(app_state);
    match comment_crud
        .create(payload.content, payload.issue_id, user_id)
        .await
    {
        Ok(comment) => Ok(Json(comment)),
        Err(e) => {
            debug!("Error creating comment: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_comment(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(app_state);
    match comment_crud.find_by_id(id).await {
        Ok(Some(comment)) => Ok(Json(comment)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            debug!("Error getting comment {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_comments_by_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(app_state);
    match comment_crud.find_by_issue_id(id).await {
        Ok(comments) => Ok(Json(comments)),
        Err(e) => {
            debug!("Error getting comments for issue {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_comments_by_user(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(app_state);
    match comment_crud.find_by_user_id(id).await {
        Ok(comments) => Ok(Json(comments)),
        Err(e) => {
            debug!("Error getting comments for user {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
