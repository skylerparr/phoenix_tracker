use crate::crud::issue_assignee::IssueAssigneeCrud;
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
use tracing::{debug, info};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIssueAssigneeRequest {
    issue_id: i32,
    user_id: i32,
}

pub fn issue_assignee_routes() -> Router<AppState> {
    Router::new()
        .route("/issue-assignees", post(create_issue_assignee))
        .route("/issue-assignees/issue/{id}", get(get_issue_assignees))
        .route("/issue-assignees/user/{id}", get(get_user_assignees))
        .route(
            "/issue-assignees/{issue_id}/{user_id}",
            delete(delete_issue_assignee),
        )
}

#[axum::debug_handler]
async fn create_issue_assignee(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateIssueAssigneeRequest>,
) -> impl IntoResponse {
    debug!("Creating issue assignee");
    let issue_assignee_crud = IssueAssigneeCrud::new(app_state);
    match issue_assignee_crud
        .create(payload.issue_id, payload.user_id)
        .await
    {
        Ok(issue_assignee) => Ok(Json(issue_assignee)),
        Err(e) => {
            info!("Error creating issue assignee: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_issue_assignees(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let issue_assignee_crud = IssueAssigneeCrud::new(app_state);
    match issue_assignee_crud.find_by_issue_id(id).await {
        Ok(issue_assignees) => Ok(Json(issue_assignees)),
        Err(e) => {
            info!("Error getting issue assignees: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_user_assignees(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let issue_assignee_crud = IssueAssigneeCrud::new(app_state);
    match issue_assignee_crud.find_by_user_id(id).await {
        Ok(issue_assignees) => Ok(Json(issue_assignees)),
        Err(e) => {
            info!("Error getting user assignees: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn delete_issue_assignee(
    Extension(app_state): Extension<AppState>,
    Path((issue_id, user_id)): Path<(i32, i32)>,
) -> StatusCode {
    let issue_assignee_crud = IssueAssigneeCrud::new(app_state);
    match issue_assignee_crud.delete(issue_id, user_id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            info!("Error deleting issue assignee: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
