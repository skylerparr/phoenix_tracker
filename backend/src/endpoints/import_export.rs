use crate::crud::import_export::ImportExportCrud;
use crate::AppState;
use axum::{
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Extension, Json, Router,
};
use std::collections::HashMap;
use tracing::info;

pub fn import_export_routes() -> Router<AppState> {
    Router::new()
        .route("/export", get(export_data))
        .route("/import", post(import_data))
}

#[axum::debug_handler]
async fn export_data(Extension(app_state): Extension<AppState>) -> impl IntoResponse {
    let import_export_crud = ImportExportCrud::new(app_state);

    match import_export_crud.export_all_data().await {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            info!("Error exporting data: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn import_data(
    Extension(app_state): Extension<AppState>,
    Json(payload): Json<HashMap<String, Vec<serde_json::Value>>>,
) -> Result<StatusCode, StatusCode> {
    let import_export_crud = ImportExportCrud::new(app_state);

    match import_export_crud.import_data(payload).await {
        Ok(_) => Ok(StatusCode::OK),
        Err(e) => {
            info!("Error importing data: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
