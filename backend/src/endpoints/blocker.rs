use crate::crud::blocker::BlockerCrud;
use crate::AppState;
use axum::Extension;
use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use tracing::{debug, info};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBlockerRequest {
    blocker_id: i32,
    blocked_id: i32,
}

pub fn blocker_routes() -> Router<AppState> {
    Router::new()
        .route("/blockers", post(create_blocker))
        .route("/blockers/blocker/{id}", get(get_blocker_issues))
        .route("/blockers/blocked/{id}", get(get_blocked_issues))
        .route("/blockers/{blocker_id}/{blocked_id}", delete(delete_blocker))
}

#[axum::debug_handler]
async fn create_blocker(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<CreateBlockerRequest>,
) -> impl IntoResponse {
    debug!("Creating blocker");
    let blocker_crud = BlockerCrud::new(app_state);
    match blocker_crud
        .create(payload.blocker_id, payload.blocked_id)
        .await
    {
        Ok(blocker) => Ok(Json(blocker)),
        Err(e) => {
            info!("Error creating blocker: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_blocker_issues(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let blocker_crud = BlockerCrud::new(app_state);
    match blocker_crud.find_by_blocker_id(id).await {
        Ok(blockers) => Ok(Json(blockers)),
        Err(e) => {
            info!("Error getting blocker issues: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn get_blocked_issues(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let blocker_crud = BlockerCrud::new(app_state);
    match blocker_crud.find_by_blocked_id(id).await {
        Ok(blockers) => Ok(Json(blockers)),
        Err(e) => {
            info!("Error getting blocked issues: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn delete_blocker(
    Extension(app_state): Extension<AppState>,
    Path((blocker_id, blocked_id)): Path<(i32, i32)>,
) -> StatusCode {
    let blocker_crud = BlockerCrud::new(app_state);
    match blocker_crud.delete(blocker_id, blocked_id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(e) => {
            info!("Error deleting blocker: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
