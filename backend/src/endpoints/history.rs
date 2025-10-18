use crate::crud::history::HistoryCrud;
use crate::crud::project_note_history::ProjectNoteHistoryCrud;
use crate::AppState;
use axum::Extension;
use axum::{extract::Path, http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use tracing::debug;

pub fn history_routes() -> Router<AppState> {
    Router::new()
        .route("/history/issue/:id", get(get_history_by_issue))
        .route(
            "/history/project-note/:id",
            get(get_history_by_project_note),
        )
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

#[axum::debug_handler]
async fn get_history_by_project_note(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let history_crud = ProjectNoteHistoryCrud::new(app_state.db);
    match history_crud.find_by_project_note_id(id).await {
        Ok(history) => Ok(Json(history)),
        Err(e) => {
            debug!("Error getting history for project note {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
