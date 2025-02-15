use crate::crud::owner::OwnerCrud;
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use tracing::info;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOwnerRequest {
    user_id: Option<i32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOwnerRequest {
    user_id: Option<i32>,
}

pub fn owner_routes() -> Router<AppState> {
    Router::new()
        .route("/owners", post(create_owner))
        .route("/owners", get(get_all_owners))
        .route("/owners/:id", get(get_owner))
        .route("/owners/:id", put(update_owner))
        .route("/owners/:id", delete(delete_owner))
}

#[axum::debug_handler]
async fn create_owner(
    State(app_state): State<AppState>,
    Json(payload): Json<CreateOwnerRequest>,
) -> impl IntoResponse {
    let owner_crud = OwnerCrud::new(app_state.db);
    match owner_crud.create(payload.user_id).await {
        Ok(owner) => Ok(Json(owner)),
        Err(e) => {
            info!("Error creating owner: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_all_owners(State(app_state): State<AppState>) -> impl IntoResponse {
    let owner_crud = OwnerCrud::new(app_state.db);
    match owner_crud.find_all().await {
        Ok(owners) => Ok(Json(owners)),
        Err(e) => {
            info!("Error getting all owners: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_owner(State(app_state): State<AppState>, Path(id): Path<i32>) -> impl IntoResponse {
    let owner_crud = OwnerCrud::new(app_state.db);
    match owner_crud.find_by_id(id).await {
        Ok(Some(owner)) => Ok(Json(owner)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            info!("Error getting owner {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn update_owner(
    State(app_state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateOwnerRequest>,
) -> impl IntoResponse {
    let owner_crud = OwnerCrud::new(app_state.db);
    match owner_crud.update(id, payload.user_id).await {
        Ok(owner) => Ok(Json(owner)),
        Err(e) => {
            if e.to_string().contains("Owner not found") {
                Err(StatusCode::NOT_FOUND)
            } else {
                info!("Error updating owner {}: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

#[axum::debug_handler]
async fn delete_owner(State(app_state): State<AppState>, Path(id): Path<i32>) -> StatusCode {
    let owner_crud = OwnerCrud::new(app_state.db);
    match owner_crud.delete(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            info!("Error deleting owner {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
