use crate::crud::project_note::ProjectNoteCrud;
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
pub struct CreateProjectNoteRequest {
    title: String,
    detail: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectNoteRequest {
    title: Option<String>,
    detail: Option<String>,
}

pub fn project_note_routes() -> Router<AppState> {
    Router::new()
        .route("/project-notes", post(create_project_note))
        .route("/project-notes/:id", get(get_project_note))
        .route("/project-notes/project", get(get_project_note_by_project))
        .route("/project-notes/:id", put(update_project_note))
        .route("/project-notes/:id", delete(delete_project_note))
}

#[axum::debug_handler]
async fn create_project_note(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateProjectNoteRequest>,
) -> impl IntoResponse {
    debug!("Creating project note");
    let project_note_crud = ProjectNoteCrud::new(app_state);
    match project_note_crud
        .create(payload.title, payload.detail)
        .await
    {
        Ok(project_note) => Ok(Json(project_note)),
        Err(e) => {
            debug!("Error creating project note: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_project_note(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let project_note_crud = ProjectNoteCrud::new(app_state);
    match project_note_crud.find_by_id(id).await {
        Ok(Some(project_note)) => Ok(Json(project_note)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            debug!("Error getting project note {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_project_note_by_project(
    Extension(app_state): Extension<AppState>,
) -> impl IntoResponse {
    let project_note_crud = ProjectNoteCrud::new(app_state);
    match project_note_crud.find_all().await {
        Ok(project_note) => Ok(Json(project_note)),
        Err(e) => {
            debug!("Error getting project notes for project {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn update_project_note(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateProjectNoteRequest>,
) -> impl IntoResponse {
    let project_note_crud = ProjectNoteCrud::new(app_state);
    match project_note_crud
        .update(id, payload.title, payload.detail)
        .await
    {
        Ok(project_note) => Ok(Json(project_note)),
        Err(e) => {
            debug!("Error updating project note {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn delete_project_note(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let project_note_crud = ProjectNoteCrud::new(app_state);
    match project_note_crud.delete(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            debug!("Error deleting project note {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
