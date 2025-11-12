use crate::crud::project_note_tag::ProjectNoteTagCrud;
use crate::AppState;
use axum::Extension;
use axum::{extract::Path, http::StatusCode, response::IntoResponse, routing::get, Json, Router};
use tracing::debug;

pub fn project_note_tag_routes() -> Router<AppState> {
    Router::new().route(
        "/project-note-tags/tag/{tag_name}",
        get(get_project_note_tag_by_tag_name),
    )
}

#[axum::debug_handler]
async fn get_project_note_tag_by_tag_name(
    Extension(app_state): Extension<AppState>,
    Path(tag_name): Path<String>,
) -> impl IntoResponse {
    let project = match &app_state.project {
        Some(p) => p,
        None => {
            debug!("No project found in app state");
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    let project_note_tag_crud = ProjectNoteTagCrud::new(app_state.clone());
    match project_note_tag_crud
        .get_by_tag_name(project.id, &tag_name)
        .await
    {
        Ok(Some(project_note_tag)) => Ok(Json(project_note_tag)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            debug!(
                "Error getting project note tag by tag name {}: {:?}",
                tag_name, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
