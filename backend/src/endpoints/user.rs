use crate::crud::user::UserCrud;
use axum::extract::Query;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize)]
pub struct CreateUserRequest {
    name: String,
    email: String,
}

#[derive(Deserialize)]
pub struct UpdateUserRequest {
    name: Option<String>,
    email: Option<String>,
}

pub fn user_routes() -> Router<DatabaseConnection> {
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
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateUserRequest>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(db);
    match user_crud.create(payload.name, payload.email).await {
        Ok(user) => Ok(Json(user)),
        Err(e) => {
            println!("Error creating user: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_all_users(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    let user_crud = UserCrud::new(db);
    match user_crud.find_all().await {
        Ok(users) => Ok(Json(users)),
        Err(e) => {
            println!("Error getting all users: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_user(State(db): State<DatabaseConnection>, Path(id): Path<i32>) -> impl IntoResponse {
    let user_crud = UserCrud::new(db);
    match user_crud.find_by_id(id).await {
        Ok(Some(user)) => Ok(Json(user)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            println!("Error getting user {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_user_by_email(
    State(db): State<DatabaseConnection>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let email = match params.get("email") {
        Some(email) => email,
        None => return Err(StatusCode::BAD_REQUEST),
    };

    let user_crud = UserCrud::new(db);
    match user_crud.find_by_email(email.to_string()).await {
        Ok(Some(user)) => Ok(Json(user)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            println!("Error getting user by email {}: {:?}", email, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
#[axum::debug_handler]
async fn update_user(
    State(db): State<DatabaseConnection>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateUserRequest>,
) -> impl IntoResponse {
    let user_crud = UserCrud::new(db);
    match user_crud.update(id, payload.name, payload.email).await {
        Ok(user) => Ok(Json(user)),
        Err(e) => {
            if e.to_string().contains("User not found") {
                Err(StatusCode::NOT_FOUND)
            } else {
                println!("Error updating user {}: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

#[axum::debug_handler]
async fn delete_user(State(db): State<DatabaseConnection>, Path(id): Path<i32>) -> StatusCode {
    let user_crud = UserCrud::new(db);
    match user_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            println!("Error deleting user {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
