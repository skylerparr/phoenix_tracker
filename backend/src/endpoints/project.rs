use crate::crud::owner::OwnerCrud;
use crate::crud::project::ProjectCrud;
use crate::crud::project_user::ProjectUserCrud;
use crate::crud::user_setting::UserSettingCrud;
use crate::entities::user;
use crate::AppState;
use axum::body::Body;
use axum::http::Request;
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
pub struct CreateProjectRequest {
    name: String,
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
        .route("/projects/:id/user", get(select_project))
}
#[axum::debug_handler]
async fn create_project(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateProjectRequest>,
) -> impl IntoResponse {
    let user = app_state.user.clone();
    match user {
        Some(user) => {
            let owner_crud = OwnerCrud::new(app_state.db.clone());
            let project_crud = ProjectCrud::new(app_state.db.clone());
            let project_user_crud = ProjectUserCrud::new(app_state.clone());
            match owner_crud.create(Some(user.id)).await {
                Ok(owner) => match project_crud.create(payload.name, owner.id).await {
                    Ok(project) => match project_user_crud.create(project.id, user.id).await {
                        Ok(_) => Ok(Json(project)),
                        Err(e) => {
                            debug!("Error creating project user: {:?}", e);
                            Err(StatusCode::INTERNAL_SERVER_ERROR)
                        }
                    },
                    Err(e) => {
                        debug!("Error creating project: {:?}", e);
                        Err(StatusCode::INTERNAL_SERVER_ERROR)
                    }
                },
                Err(e) => {
                    debug!("Error creating owner: {:?}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
#[axum::debug_handler]
async fn get_all_projects(Extension(app_state): Extension<AppState>) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(app_state.db);
    match project_crud.find_all().await {
        Ok(projects) => Ok(Json(projects)),
        Err(e) => {
            debug!("Error getting all projects: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_project(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let project_crud = ProjectCrud::new(app_state.db);
    match project_crud.find_by_id(id).await {
        Ok(Some(project)) => Ok(Json(project)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            debug!("Error getting project {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
#[axum::debug_handler]
async fn get_all_projects_by_user_id(
    Extension(app_state): Extension<AppState>,
) -> impl IntoResponse {
    let user = app_state.user.clone();
    match user {
        Some(user) => {
            let project_crud = ProjectCrud::new(app_state.db);
            match project_crud.find_all_projects_by_user_id(user.id).await {
                Ok(projects) => Ok(Json(projects)),
                Err(e) => {
                    debug!("Error getting projects: {:?}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
#[axum::debug_handler]
async fn update_project(
    Extension(app_state): Extension<AppState>,
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
                debug!("Error updating project {}: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

#[axum::debug_handler]
async fn delete_project(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> StatusCode {
    let project_crud = ProjectCrud::new(app_state.db);
    match project_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            debug!("Error deleting project {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

#[axum::debug_handler]
async fn select_project(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let user = app_state.user.clone();
    match user {
        Some(user) => {
            let project_crud = ProjectCrud::new(app_state.db.clone());
            match project_crud.find_by_id(id).await {
                Ok(project) => {
                    let user_setting_crud = UserSettingCrud::new(app_state.db.clone());
                    match user_setting_crud.upsert(user.id, Some(id)).await {
                        Ok(_) => Ok(Json(project)),
                        Err(e) => {
                            debug!("Error updating user setting: {:?}", e);
                            Err(StatusCode::INTERNAL_SERVER_ERROR)
                        }
                    }
                }
                Err(e) => {
                    if e.to_string().contains("Project not found") {
                        Err(StatusCode::NOT_FOUND)
                    } else {
                        debug!("Error getting project {}: {:?}", id, e);
                        Err(StatusCode::INTERNAL_SERVER_ERROR)
                    }
                }
            }
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
