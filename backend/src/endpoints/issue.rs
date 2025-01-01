use crate::crud::issue::IssueCrud;
use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use tracing::debug;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIssueRequest {
    title: String,
    description: String,
    priority: i32,
    points: Option<i32>,
    status: i32,
    work_type: i32,
    project_id: i32,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIssueRequest {
    title: Option<String>,
    description: Option<String>,
    priority: Option<i32>,
    points: Option<i32>,
    status: Option<i32>,
    work_type: Option<i32>,
    project_id: Option<i32>,
}

pub fn issue_routes() -> Router<AppState> {
    Router::new()
        .route("/issues", post(create_issue))
        .route("/issues", get(get_all_issues))
        .route("/issues/:id", get(get_issue))
        .route("/issues/:id", put(update_issue))
        .route("/issues/:id", delete(delete_issue))
}

#[axum::debug_handler]
pub async fn create_issue(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateIssueRequest>,
) -> impl IntoResponse {
    debug!("Creating issue");
    let issue_crud = IssueCrud::new(app_state.db);
    match issue_crud
        .create(
            payload.title,
            Some(payload.description),
            payload.priority,
            payload.points,
            payload.status,
            payload.work_type,
            payload.project_id,
            app_state.user.clone().unwrap().id,
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
async fn get_all_issues(State(app_state): State<AppState>) -> impl IntoResponse {
    let issue_crud = IssueCrud::new(app_state.db);
    match issue_crud.find_all().await {
        Ok(issues) => Ok(Json(issues)),
        Err(e) => {
            println!("Error getting all issues: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_issue(State(app_state): State<AppState>, Path(id): Path<i32>) -> impl IntoResponse {
    let issue_crud = IssueCrud::new(app_state.db);
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
    State(app_state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateIssueRequest>,
) -> impl IntoResponse {
    let issue_crud = IssueCrud::new(app_state.db);
    match issue_crud
        .update(
            id,
            payload.title,
            Some(payload.description),
            payload.priority,
            payload.points,
            payload.status,
            payload.work_type,
            payload.project_id,
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
async fn delete_issue(State(app_state): State<AppState>, Path(id): Path<i32>) -> StatusCode {
    let issue_crud = IssueCrud::new(app_state.db);
    match issue_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            println!("Error deleting issue {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
