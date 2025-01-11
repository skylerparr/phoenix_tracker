use crate::crud::project_user::ProjectUserCrud;
use crate::crud::user::UserCrud;
use crate::AppState;
use axum::extract::Query;
use axum::Extension;
use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use std::collections::HashMap;
use tracing::info;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    name: String,
    email: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRequest {
    name: Option<String>,
    email: Option<String>,
}

pub fn user_routes() -> Router<AppState> {
    Router::new()
        .route("/users", post(create_user))
        .route("/users", get(get_all_users))
        .route("/users/:id", get(get_user))
        .route("/users/:id", put(update_user))
        .route("/users/:id", delete(delete_user))
        .route("/users/by-email", get(get_user_by_email))
}

#[axum::debug_handler]
async fn create_user(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(app_state.db);
    match user_crud.create(payload.name, payload.email).await {
        Ok(user) => Ok(Json(user)),
        Err(e) => {
            info!("Error creating user: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
#[axum::debug_handler]
async fn get_all_users(Extension(app_state): Extension<AppState>) -> impl IntoResponse {
    let project_id = app_state.project.clone().unwrap().id;

    let project_users_crud = ProjectUserCrud::new(app_state.clone());
    let project_users = project_users_crud.get_users_for_project(project_id).await;

    match project_users {
        Ok(project_users) => {
            let user_ids = project_users
                .iter()
                .map(|project_user| project_user.user_id)
                .collect::<Vec<_>>();
            let user_crud = UserCrud::new(app_state.db);
            match user_crud.find_all(user_ids).await {
                Ok(users) => Ok(Json(users)),
                Err(e) => {
                    info!("Error getting all users: {:?}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Err(e) => {
            info!("Error getting project users: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_user(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(app_state.db);
    match user_crud.find_by_id(id).await {
        Ok(Some(user)) => Ok(Json(user)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            info!("Error getting user {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_user_by_email(
    Extension(app_state): Extension<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let email = match params.get("email") {
        Some(email) => email,
        None => return Err(StatusCode::BAD_REQUEST),
    };

    let user_crud = UserCrud::new(app_state.db);
    match user_crud.find_by_email(email.to_string()).await {
        Ok(Some(user)) => Ok(Json(user)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            info!("Error getting user by email {}: {:?}", email, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn update_user(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateUserRequest>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(app_state.db);
    match user_crud.update(id, payload.name, payload.email).await {
        Ok(user) => Ok(Json(user)),
        Err(e) => {
            if e.to_string().contains("User not found") {
                Err(StatusCode::NOT_FOUND)
            } else {
                info!("Error updating user {}: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

#[axum::debug_handler]
async fn delete_user(Extension(app_state): Extension<AppState>, Path(id): Path<i32>) -> StatusCode {
    let user_crud = UserCrud::new(app_state.db);
    match user_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            info!("Error deleting user {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
