use crate::crud::comment::CommentCrud;
use crate::crud::comment_file_upload::CommentFileUploadCrud;
use crate::entities::{comment, file_upload};
use crate::AppState;
use axum::Extension;
use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tracing::debug;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCommentRequest {
    content: String,
    issue_id: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCommentRequest {
    content: String,
}

#[derive(Serialize)]
pub struct CommentResponse {
    #[serde(flatten)]
    pub comment: comment::Model,
    pub uploads: Vec<file_upload::Model>,
}

pub fn comment_routes() -> Router<AppState> {
    Router::new()
        .route("/comments", post(create_comment))
        .route("/comments/issue/{id}", get(get_comments_by_issue))
        .route("/comments/user/{id}", get(get_comments_by_user))
        .route(
            "/comments/{id}",
            get(get_comment).put(update_comment).delete(delete_comment),
        )
}

#[axum::debug_handler]
async fn create_comment(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateCommentRequest>,
) -> impl IntoResponse {
    let user_id = app_state.user.as_ref().unwrap().id;
    let comment_crud = CommentCrud::new(app_state.clone());
    let upload_crud = CommentFileUploadCrud::new(app_state);
    match comment_crud
        .create(payload.content, payload.issue_id, user_id)
        .await
    {
        Ok(comment) => match upload_crud.find_uploads_by_comment_id(comment.id).await {
            Ok(uploads) => Ok(Json(CommentResponse { comment, uploads })),
            Err(e) => {
                debug!("Error loading uploads for new comment: {:?}", e);
                Ok(Json(CommentResponse {
                    comment,
                    uploads: vec![],
                }))
            }
        },
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
    let comment_crud = CommentCrud::new(app_state.clone());
    let upload_crud = CommentFileUploadCrud::new(app_state);
    match comment_crud.find_by_id(id).await {
        Ok(Some(comment)) => match upload_crud.find_uploads_by_comment_id(comment.id).await {
            Ok(uploads) => Ok(Json(CommentResponse { comment, uploads })),
            Err(e) => {
                debug!("Error loading uploads for comment {}: {:?}", id, e);
                Ok(Json(CommentResponse {
                    comment,
                    uploads: vec![],
                }))
            }
        },
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
    let comment_crud = CommentCrud::new(app_state.clone());
    let upload_crud = CommentFileUploadCrud::new(app_state);
    match comment_crud.find_by_issue_id(id).await {
        Ok(comments) => {
            let mut enriched: Vec<CommentResponse> = Vec::with_capacity(comments.len());
            for c in comments {
                match upload_crud.find_uploads_by_comment_id(c.id).await {
                    Ok(uploads) => enriched.push(CommentResponse {
                        comment: c,
                        uploads,
                    }),
                    Err(e) => {
                        debug!("Error loading uploads for comment {}: {:?}", c.id, e);
                        enriched.push(CommentResponse {
                            comment: c,
                            uploads: vec![],
                        });
                    }
                }
            }
            Ok(Json(enriched))
        }
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
    let comment_crud = CommentCrud::new(app_state.clone());
    let upload_crud = CommentFileUploadCrud::new(app_state);
    match comment_crud.find_by_user_id(id).await {
        Ok(comments) => {
            let mut enriched: Vec<CommentResponse> = Vec::with_capacity(comments.len());
            for c in comments {
                match upload_crud.find_uploads_by_comment_id(c.id).await {
                    Ok(uploads) => enriched.push(CommentResponse {
                        comment: c,
                        uploads,
                    }),
                    Err(e) => {
                        debug!("Error loading uploads for comment {}: {:?}", c.id, e);
                        enriched.push(CommentResponse {
                            comment: c,
                            uploads: vec![],
                        });
                    }
                }
            }
            Ok(Json(enriched))
        }
        Err(e) => {
            debug!("Error getting comments for user {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn update_comment(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateCommentRequest>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(app_state.clone());
    let upload_crud = CommentFileUploadCrud::new(app_state);
    match comment_crud.update(id, payload.content).await {
        Ok(comment) => match upload_crud.find_uploads_by_comment_id(comment.id).await {
            Ok(uploads) => Ok(Json(CommentResponse { comment, uploads })),
            Err(e) => {
                debug!("Error loading uploads for comment {}: {:?}", id, e);
                Ok(Json(CommentResponse {
                    comment,
                    uploads: vec![],
                }))
            }
        },
        Err(e) => {
            debug!("Error updating comment {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn delete_comment(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let comment_crud = CommentCrud::new(app_state);
    match comment_crud.delete(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            debug!("Error deleting comment {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
