use crate::crud::issue::IssueCrud;
use crate::crud::status::{
    STATUS_ACCEPTED, STATUS_COMPLETED, STATUS_IN_PROGRESS, STATUS_REJECTED, STATUS_UNSTARTED,
};
use crate::AppState;
use axum::Extension;
use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use sea_orm::entity::prelude::*;
use serde::Deserialize;
use tracing::debug;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIssueRequest {
    title: String,
    description: Option<String>,
    priority: i32,
    points: Option<Option<i32>>,
    is_icebox: bool,
    work_type: i32,
    target_release_at: Option<DateTimeWithTimeZone>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIssueRequest {
    title: Option<String>,
    description: Option<String>,
    priority: Option<i32>,
    points: Option<i32>,
    status: Option<i32>,
    is_icebox: Option<bool>,
    work_type: Option<i32>,
    target_release_at: Option<DateTimeWithTimeZone>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkPriorityUpdate {
    issue_priorities: Vec<(i32, i32)>, // (issue_id, new_priority)
}
pub fn issue_routes() -> Router<AppState> {
    Router::new()
        .route("/issues", post(create_issue))
        .route("/issues", get(get_all_issues_for_backlog))
        .route("/issues/:id", get(get_issue))
        .route("/issues/:id", put(update_issue))
        .route("/issues/:id/start", put(start_issue))
        .route("/issues/:id/finish", put(finish_issue))
        .route("/issues/:id/accept", put(accept_issue))
        .route("/issues/:id/reject", put(reject_issue))
        .route("/issues/:id", delete(delete_issue))
        .route("/issues/bulk-priority", put(bulk_update_priorities))
        .route("/issues/me", get(get_issues_for_me))
        .route("/issues/tag/:id", get(get_issues_by_tag))
        .route("/issues/accepted", get(get_all_accepted))
        .route("/issues/icebox", get(get_all_icebox))
}

#[axum::debug_handler]
pub async fn create_issue(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateIssueRequest>,
) -> impl IntoResponse {
    debug!("Creating issue");
    let user_id = app_state.user.clone().unwrap().id;
    let project_id = app_state.project.clone().unwrap().id;

    let issue_crud = IssueCrud::new(app_state);
    match issue_crud
        .create(
            payload.title,
            payload.description,
            payload.priority,
            payload.points,
            STATUS_UNSTARTED,
            payload.is_icebox,
            payload.work_type,
            project_id,
            payload.target_release_at,
            user_id,
        )
        .await
    {
        Ok(issue) => Ok(Json(issue)),
        Err(e) => {
            println!("Error creating issue: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
#[axum::debug_handler]
async fn get_all_issues_for_backlog(
    Extension(app_state): Extension<AppState>,
) -> impl IntoResponse {
    let project_id = app_state.project.clone().unwrap().id;
    let issue_crud = IssueCrud::new(app_state);
    match issue_crud.find_all_for_backlog(project_id, false).await {
        Ok(issues) => Ok(Json(issues)),
        Err(e) => {
            println!("Error getting all issues: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
#[axum::debug_handler]
async fn get_issues_for_me(Extension(app_state): Extension<AppState>) -> impl IntoResponse {
    let user_id = app_state.user.clone().unwrap().id;
    let issue_crud = IssueCrud::new(app_state);
    match issue_crud.find_all_by_user_id(user_id).await {
        Ok(issues) => Ok(Json(issues)),
        Err(e) => {
            println!("Error getting all issues: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
#[axum::debug_handler]
async fn get_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let issue_crud = IssueCrud::new(app_state);
    match issue_crud.find_by_id(id).await {
        Ok(Some(issue)) => Ok(Json(issue)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            println!("Error getting issue {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn update_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateIssueRequest>,
) -> impl IntoResponse {
    let project_id = app_state.project.clone().unwrap().id;

    let issue_crud = IssueCrud::new(app_state);
    match issue_crud
        .update(
            id,
            payload.title,
            payload.description,
            payload.priority,
            payload.points,
            payload.status,
            payload.is_icebox,
            payload.work_type,
            payload.target_release_at,
            project_id,
        )
        .await
    {
        Ok(issue) => Ok(Json(issue)),
        Err(e) => {
            if e.to_string().contains("Issue not found") {
                Err(StatusCode::NOT_FOUND)
            } else {
                println!("Error updating issue {}: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}
#[axum::debug_handler]
async fn start_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    update_issue_status(app_state, id, STATUS_IN_PROGRESS).await
}

#[axum::debug_handler]
async fn finish_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    update_issue_status(app_state, id, STATUS_COMPLETED).await
}

#[axum::debug_handler]
async fn accept_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    update_issue_status(app_state, id, STATUS_ACCEPTED).await
}

#[axum::debug_handler]
async fn reject_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    update_issue_status(app_state, id, STATUS_REJECTED).await
}

async fn update_issue_status(app_state: AppState, id: i32, status: i32) -> impl IntoResponse {
    let project_id = app_state.project.clone().unwrap().id;
    let issue_crud = IssueCrud::new(app_state);
    // whenever the status is updated, the is_icebox flag should be set to false
    match issue_crud
        .update(
            id,
            None,
            None,
            None,
            None,
            Some(status),
            Some(false),
            None,
            None,
            project_id,
        )
        .await
    {
        Ok(issue) => Ok(Json(issue)),
        Err(e) => {
            if e.to_string().contains("Issue not found") {
                Err(StatusCode::NOT_FOUND)
            } else {
                println!("Error updating issue {}: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

#[axum::debug_handler]
async fn delete_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> StatusCode {
    let issue_crud = IssueCrud::new(app_state);
    match issue_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            println!("Error deleting issue {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

#[axum::debug_handler]
async fn bulk_update_priorities(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<BulkPriorityUpdate>,
) -> impl IntoResponse {
    let issue_crud = IssueCrud::new(app_state);

    match issue_crud
        .bulk_update_priorities(payload.issue_priorities)
        .await
    {
        Ok(updated_issues) => Ok(Json(updated_issues)),
        Err(e) => {
            println!("Error updating issue priorities: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_issues_by_tag(
    Extension(app_state): Extension<AppState>,
    Path(tag_id): Path<i32>,
) -> impl IntoResponse {
    let issue_crud = IssueCrud::new(app_state);
    match issue_crud.find_all_by_tag_id(tag_id).await {
        Ok(issues) => Ok(Json(issues)),
        Err(e) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[axum::debug_handler]
async fn get_all_accepted(Extension(app_state): Extension<AppState>) -> impl IntoResponse {
    let project_id = app_state.project.clone().unwrap().id;
    let issue_crud = IssueCrud::new(app_state);
    match issue_crud.find_all_accepted(project_id).await {
        Ok(issues) => Ok(Json(issues)),
        Err(e) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[axum::debug_handler]
async fn get_all_icebox(Extension(app_state): Extension<AppState>) -> impl IntoResponse {
    let project_id = app_state.project.clone().unwrap().id;
    let issue_crud = IssueCrud::new(app_state);
    match issue_crud.find_all_icebox(project_id).await {
        Ok(issues) => Ok(Json(issues)),
        Err(e) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
