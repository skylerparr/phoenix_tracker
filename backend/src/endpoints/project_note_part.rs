use crate::crud::project_note_parts::ProjectNotePartsCrud;
use crate::AppState;
use axum::Extension;
use axum::{extract::Path, http::StatusCode, response::IntoResponse, routing::put, Json, Router};
use serde::Deserialize;
use tracing::info;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectNotePartRequest {
    content: String,
}

pub fn project_note_part_routes() -> Router<AppState> {
    Router::new().route(
        "/project-note-parts/:id/content",
        put(update_project_note_part_content),
    )
}

#[axum::debug_handler]
async fn update_project_note_part_content(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateProjectNotePartRequest>,
) -> impl IntoResponse {
    let project_note_parts_crud = ProjectNotePartsCrud::new(app_state);
    match project_note_parts_crud
        .update_content(id, payload.content)
        .await
    {
        Ok(project_note_part) => Ok(Json(project_note_part)),
        Err(e) => {
            info!("Error updating project note part {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
