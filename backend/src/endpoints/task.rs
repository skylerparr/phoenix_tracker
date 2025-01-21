use crate::crud::task::TaskCrud;
use crate::AppState;
use axum::Extension;
use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use tracing::debug;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskRequest {
    title: String,
    issue_id: i32,
    completed: bool,
    percent: f32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskRequest {
    title: Option<String>,
    completed: Option<bool>,
    percent: Option<f32>,
}

pub fn task_routes() -> Router<AppState> {
    Router::new()
        .route("/tasks", post(create_task))
        .route("/tasks/:id", get(get_task))
        .route("/tasks/issue/:id", get(get_tasks_by_issue))
        .route("/tasks/:id", put(update_task))
        .route("/tasks/:id", delete(delete_task))
}

#[axum::debug_handler]
async fn create_task(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateTaskRequest>,
) -> impl IntoResponse {
    debug!("Creating task");
    let task_crud = TaskCrud::new(app_state);
    match task_crud
        .create(
            payload.title,
            payload.issue_id,
            payload.completed,
            payload.percent,
        )
        .await
    {
        Ok(task) => Ok(Json(task)),
        Err(e) => {
            debug!("Error creating task: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_task(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let task_crud = TaskCrud::new(app_state);
    match task_crud.find_by_id(id).await {
        Ok(Some(task)) => Ok(Json(task)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            debug!("Error getting task {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_tasks_by_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let task_crud = TaskCrud::new(app_state);
    match task_crud.find_by_issue_id(id).await {
        Ok(tasks) => Ok(Json(tasks)),
        Err(e) => {
            debug!("Error getting tasks for issue {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn update_task(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateTaskRequest>,
) -> impl IntoResponse {
    let task_crud = TaskCrud::new(app_state);
    match task_crud
        .update(id, payload.title, payload.completed, payload.percent)
        .await
    {
        Ok(task) => Ok(Json(task)),
        Err(e) => {
            debug!("Error updating task {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn delete_task(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let task_crud = TaskCrud::new(app_state);
    match task_crud.delete(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            debug!("Error deleting task {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
