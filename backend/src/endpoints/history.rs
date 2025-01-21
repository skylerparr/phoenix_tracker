use crate::crud::history::HistoryCrud;
use crate::AppState;
use axum::Extension;
use axum::{extract::Path, http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use serde::Deserialize;
use tracing::debug;

pub fn history_routes() -> Router<AppState> {
    Router::new().route("/history/issue/:id", get(get_history_by_issue))
}

#[axum::debug_handler]
async fn get_history_by_issue(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let history_crud = HistoryCrud::new(app_state.db);
    match history_crud.find_by_issue_id(id).await {
        Ok(history) => Ok(Json(history)),
        Err(e) => {
            debug!("Error getting history for issue {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
