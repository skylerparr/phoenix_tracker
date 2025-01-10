use crate::crud::issue::IssueCrud;
use crate::crud::tag::TagCrud;
use crate::AppState;
use axum::Extension;
use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagRequest {
    name: String,
    is_epic: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagRequest {
    name: Option<String>,
    is_epic: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagWithCount {
    id: i32,
    name: String,
    is_epic: bool,
    count: i64,
}

pub fn tag_routes() -> Router<AppState> {
    Router::new()
        .route("/tags", post(create_tag))
        .route("/tags", get(get_all_tags))
        .route("/tags/counts", get(get_tags_with_counts))
        .route("/tags/:id", get(get_tag))
        .route("/tags/:id", put(update_tag))
        .route("/tags/:id", delete(delete_tag))
}

#[axum::debug_handler]
async fn create_tag(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateTagRequest>,
) -> impl IntoResponse {
    let project_id = app_state.project.clone().unwrap().id;
    let tag_crud = TagCrud::new(app_state);
    match tag_crud
        .create(project_id, payload.name, payload.is_epic)
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
async fn get_all_tags(Extension(app_state): Extension<AppState>) -> impl IntoResponse {
    let project_id = app_state.project.clone().unwrap().id;
    let tag_crud = TagCrud::new(app_state);
    match tag_crud.find_all(project_id).await {
        Ok(tags) => Ok(Json(tags)),
        Err(e) => {
            println!("Error getting all tags: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_tags_with_counts(Extension(app_state): Extension<AppState>) -> impl IntoResponse {
    let project_id = app_state.project.clone().unwrap().id;
    let tag_crud = TagCrud::new(app_state.clone());
    let issue_crud = IssueCrud::new(app_state);

    let tags = match tag_crud.find_all(project_id).await {
        Ok(t) => t,
        Err(e) => {
            println!("Error getting tags: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let tag_ids: Vec<i32> = tags.iter().map(|t| t.id).collect();
    let counts = match issue_crud.count_issues_by_tag_ids(tag_ids).await {
        Ok(c) => c,
        Err(e) => {
            println!("Error getting counts: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let counts_map: HashMap<i32, i64> = counts.into_iter().collect();

    let result: Vec<TagWithCount> = tags
        .into_iter()
        .map(|tag| TagWithCount {
            id: tag.id,
            name: tag.name,
            is_epic: tag.is_epic,
            count: counts_map.get(&tag.id).copied().unwrap_or(0),
        })
        .collect();

    Ok(Json(result))
}
#[axum::debug_handler]
async fn get_tag(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let tag_crud = TagCrud::new(app_state);
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
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateTagRequest>,
) -> impl IntoResponse {
    let tag_crud = TagCrud::new(app_state);
    match tag_crud.update(id, payload.name, payload.is_epic).await {
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
async fn delete_tag(Extension(app_state): Extension<AppState>, Path(id): Path<i32>) -> StatusCode {
    let tag_crud = TagCrud::new(app_state);
    match tag_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            println!("Error deleting tag {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
