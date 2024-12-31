use crate::crud::project::ProjectCrud;
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectRequest {
    name: String,
    owner_id: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectRequest {
    name: Option<String>,
    owner_id: Option<i32>,
}

pub fn project_routes() -> Router<AppState> {
    Router::new()
        .route("/projects", post(create_project))
        .route("/projects", get(get_all_projects))
        .route("/projects/:id", get(get_project))
        .route("/projects/:id", put(update_project))
        .route("/projects/:id", delete(delete_project))
        .route("/projects/user/me", get(get_all_projects_by_user_id))
}

#[axum::debug_handler]
async fn create_project(
    State(app_state): State<AppState>,
    Json(payload): Json<CreateProjectRequest>,
) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(app_state.db);
    match project_crud.create(payload.name, payload.owner_id).await {
        Ok(project) => Ok(Json(project)),
        Err(e) => {
            println!("Error creating project: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
#[axum::debug_handler]
async fn get_all_projects(State(app_state): State<AppState>) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(app_state.db);
    match project_crud.find_all().await {
        Ok(projects) => Ok(Json(projects)),
        Err(e) => {
            println!("Error getting all projects: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_project(State(app_state): State<AppState>, Path(id): Path<i32>) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(app_state.db);
    match project_crud.find_by_id(id).await {
        Ok(Some(project)) => Ok(Json(project)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            println!("Error getting project {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_all_projects_by_user_id(State(app_state): State<AppState>) -> impl IntoResponse {
    match app_state.user {
        Some(user) => {
            let project_crud = ProjectCrud::new(app_state.db);
            match project_crud.find_all_projects_by_user_id(user.id).await {
                Ok(projects) => Ok(Json(projects)),
                Err(e) => {
                    println!("Error getting projects: {:?}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}

#[axum::debug_handler]
async fn update_project(
    State(app_state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateProjectRequest>,
) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(app_state.db);
    match project_crud
        .update(id, payload.name, payload.owner_id)
        .await
    {
        Ok(project) => Ok(Json(project)),
        Err(e) => {
            if e.to_string().contains("Project not found") {
                Err(StatusCode::NOT_FOUND)
            } else {
                println!("Error updating project {}: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

#[axum::debug_handler]
async fn delete_project(State(app_state): State<AppState>, Path(id): Path<i32>) -> StatusCode {
    let project_crud = ProjectCrud::new(app_state.db);
    match project_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            println!("Error deleting project {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
