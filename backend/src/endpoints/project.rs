use crate::crud::project::ProjectCrud;
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
pub struct CreateProjectRequest {
    name: String,
    description: String,
    owner_id: i32,
}

#[derive(Deserialize)]
pub struct UpdateProjectRequest {
    name: Option<String>,
    description: Option<String>,
    owner_id: Option<i32>,
}

pub fn project_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/projects", post(create_project))
        .route("/projects", get(get_all_projects))
        .route("/projects/:id", get(get_project))
        .route("/projects/:id", put(update_project))
        .route("/projects/:id", delete(delete_project))
}

#[axum::debug_handler]
async fn create_project(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateProjectRequest>,
) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(db);
    match project_crud
        .create(payload.name, payload.description, payload.owner_id)
        .await
    {
        Ok(project) => Ok(Json(project)),
        Err(e) => {
            println!("Error creating project: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_all_projects(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(db);
    match project_crud.find_all().await {
        Ok(projects) => Ok(Json(projects)),
        Err(e) => {
            println!("Error getting all projects: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_project(
    State(db): State<DatabaseConnection>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(db);
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
async fn update_project(
    State(db): State<DatabaseConnection>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateProjectRequest>,
) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(db);
    match project_crud
        .update(id, payload.name, payload.description, payload.owner_id)
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
async fn delete_project(State(db): State<DatabaseConnection>, Path(id): Path<i32>) -> StatusCode {
    let project_crud = ProjectCrud::new(db);
    match project_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            println!("Error deleting project {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
