use crate::crud::issue_tag::IssueTagCrud;
use crate::AppState;
use axum::Extension;
use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use tracing::debug;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIssueTagRequest {
    issue_id: i32,
    tag_id: i32,
}

pub fn issue_tag_routes() -> Router<AppState> {
    Router::new()
        .route("/issue-tags", post(create_issue_tag))
        .route("/issue-tags/issue/:id", get(get_issue_tags))
        .route("/issue-tags/tag/:id", get(get_tag_issues))
        .route("/issue-tags/:issue_id/:tag_id", delete(delete_issue_tag))
}

#[axum::debug_handler]
async fn create_issue_tag(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateIssueTagRequest>,
) -> impl IntoResponse {
    debug!("Creating issue tag");
    let issue_tag_crud = IssueTagCrud::new(app_state.db);
    match issue_tag_crud
        .create(payload.issue_id, payload.tag_id)
        .await
    {
        Ok(issue_tag) => Ok(Json(issue_tag)),
        Err(e) => {
            println!("Error creating issue tag: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_issue_tags(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let issue_tag_crud = IssueTagCrud::new(app_state.db);
    match issue_tag_crud.find_by_issue_id(id).await {
        Ok(issue_tags) => Ok(Json(issue_tags)),
        Err(e) => {
            println!("Error getting issue tags: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_tag_issues(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let issue_tag_crud = IssueTagCrud::new(app_state.db);
    match issue_tag_crud.find_by_tag_id(id).await {
        Ok(issue_tags) => Ok(Json(issue_tags)),
        Err(e) => {
            println!("Error getting tag issues: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn delete_issue_tag(
    Extension(app_state): Extension<AppState>,
    Path((issue_id, tag_id)): Path<(i32, i32)>,
) -> StatusCode {
    let issue_tag_crud = IssueTagCrud::new(app_state.db);
    match issue_tag_crud.delete(issue_id, tag_id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            println!("Error deleting issue tag: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
