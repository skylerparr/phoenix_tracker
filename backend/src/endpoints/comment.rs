use crate::crud::comment::CommentCrud;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct CreateCommentRequest {
    content: String,
    user_id: i32,
    issue_id: i32,
}

#[derive(Deserialize)]
pub struct UpdateCommentRequest {
    content: Option<String>,
}

pub fn comment_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/comments", post(create_comment))
        .route("/comments", get(get_all_comments))
        .route("/comments/:id", get(get_comment))
        .route("/comments/:id", put(update_comment))
        .route("/comments/:id", delete(delete_comment))
        .route("/comments/issue/:id", get(get_comments_by_issue))
        .route("/comments/user/:id", get(get_comments_by_user))
}

#[axum::debug_handler]
async fn create_comment(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateCommentRequest>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(db);
    match comment_crud
        .create(payload.content, payload.user_id, payload.issue_id)
        .await
    {
        Ok(comment) => Ok(Json(comment)),
        Err(e) => {
            println!("Error creating comment: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_all_comments(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(db);
    match comment_crud.find_all().await {
        Ok(comments) => Ok(Json(comments)),
        Err(e) => {
            println!("Error getting all comments: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_comment(
    State(db): State<DatabaseConnection>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(db);
    match comment_crud.find_by_id(id).await {
        Ok(Some(comment)) => Ok(Json(comment)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            println!("Error getting comment {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_comments_by_issue(
    State(db): State<DatabaseConnection>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(db);
    match comment_crud.find_by_issue_id(id).await {
        Ok(comments) => Ok(Json(comments)),
        Err(e) => {
            println!("Error getting comments for issue {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_comments_by_user(
    State(db): State<DatabaseConnection>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(db);
    match comment_crud.find_by_user_id(id).await {
        Ok(comments) => Ok(Json(comments)),
        Err(e) => {
            println!("Error getting comments for user {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn update_comment(
    State(db): State<DatabaseConnection>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateCommentRequest>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(db);
    match comment_crud.update(id, payload.content).await {
        Ok(comment) => Ok(Json(comment)),
        Err(e) => {
            if e.to_string().contains("Comment not found") {
                Err(StatusCode::NOT_FOUND)
            } else {
                println!("Error updating comment {}: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

#[axum::debug_handler]
async fn delete_comment(State(db): State<DatabaseConnection>, Path(id): Path<i32>) -> StatusCode {
    let comment_crud = CommentCrud::new(db);
    match comment_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            println!("Error deleting comment {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
