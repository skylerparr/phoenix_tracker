use crate::crud::tag::TagCrud;
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
pub struct CreateTagRequest {
    name: String,
    color: u32,
    is_epic: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagRequest {
    name: Option<String>,
    color: Option<u32>,
    is_epic: Option<bool>,
}

pub fn tag_routes() -> Router<AppState> {
    Router::new()
        .route("/tags", post(create_tag))
        .route("/tags", get(get_all_tags))
        .route("/tags/:id", get(get_tag))
        .route("/tags/:id", put(update_tag))
        .route("/tags/:id", delete(delete_tag))
}

#[axum::debug_handler]
async fn create_tag(
    State(app_state): State<AppState>,
    Json(payload): Json<CreateTagRequest>,
) -> impl IntoResponse {
    let tag_crud = TagCrud::new(app_state.db);
    match tag_crud
        .create(payload.name, payload.color, payload.is_epic)
        .await
    {
        Ok(tag) => Ok(Json(tag)),
        Err(e) => {
            println!("Error creating tag: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
#[axum::debug_handler]
async fn get_all_tags(State(app_state): State<AppState>) -> impl IntoResponse {
    let tag_crud = TagCrud::new(app_state.db);
    match tag_crud.find_all().await {
        Ok(tags) => Ok(Json(tags)),
        Err(e) => {
            println!("Error getting all tags: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_tag(State(app_state): State<AppState>, Path(id): Path<i32>) -> impl IntoResponse {
    let tag_crud = TagCrud::new(app_state.db);
    match tag_crud.find_by_id(id).await {
        Ok(Some(tag)) => Ok(Json(tag)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            println!("Error getting tag {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn update_tag(
    State(app_state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateTagRequest>,
) -> impl IntoResponse {
    let tag_crud = TagCrud::new(app_state.db);
    match tag_crud
        .update(id, payload.name, payload.color, payload.is_epic)
        .await
    {
        Ok(tag) => Ok(Json(tag)),
        Err(e) => {
            if e.to_string().contains("Tag not found") {
                Err(StatusCode::NOT_FOUND)
            } else {
                println!("Error updating tag {}: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

#[axum::debug_handler]
async fn delete_tag(State(app_state): State<AppState>, Path(id): Path<i32>) -> StatusCode {
    let tag_crud = TagCrud::new(app_state.db);
    match tag_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            println!("Error deleting tag {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
