use crate::crud::comment_file_upload::CommentFileUploadCrud;
use crate::crud::file_upload::FileUploadCrud;
use crate::crud::issue::IssueCrud;
use crate::crud::project_note::ProjectNoteCrud;
use crate::AppState;
use axum::extract::{Multipart, Path};
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderValue, StatusCode};
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Extension, Json, Router};
use std::env;
use std::path::PathBuf;
use tracing::{info, warn};

pub fn file_upload_routes() -> Router<AppState> {
    Router::new()
        // Issue uploads
        .route(
            "/issues/:id/uploads",
            post(upload_for_issue).get(list_for_issue),
        )
        // Project note uploads
        .route(
            "/project-notes/:id/uploads",
            post(upload_for_project_note).get(list_for_project_note),
        )
        // Comment attachments (associate existing file to a comment)
        .route("/comments/:id/uploads", get(list_for_comment))
        .route(
            "/comments/:comment_id/uploads/:file_upload_id",
            post(attach_upload_to_comment).delete(detach_upload_from_comment),
        )
        // File upload perspective: attach an existing upload to a comment
        .route(
            "/uploads/:file_upload_id/comments/:comment_id",
            post(file_upload_attach_to_comment),
        )
        // Single upload actions
        .route("/uploads/:id", get(download_upload).delete(delete_upload))
}

#[axum::debug_handler]
async fn upload_for_issue(
    Extension(app_state): Extension<AppState>,
    Path(issue_id): Path<i32>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let user_id = app_state
        .user
        .as_ref()
        .expect("user must be set by middleware")
        .id;
    let project_id = app_state
        .project
        .as_ref()
        .expect("project must be set by middleware")
        .id;

    // Verify issue belongs to current project
    let issue_crud = IssueCrud::new(app_state.clone());
    let issue = match issue_crud.find_by_id(issue_id).await {
        Ok(Some(i)) => i,
        Ok(None) => return Err(StatusCode::NOT_FOUND),
        Err(e) => {
            info!("Error loading issue {}: {:?}", issue_id, e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };
    if issue.project_id != project_id {
        // Anti-enumeration: pretend not found if not in this project
        return Err(StatusCode::NOT_FOUND);
    }

    // Extract file field
    let (bytes, original_filename, mime_type) =
        match extract_file_from_multipart(&mut multipart).await {
            Ok(t) => t,
            Err(status) => return Err(status),
        };

    // Validate allowed MIME types and non-empty
    if bytes.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    if !is_allowed_mime(&mime_type) {
        warn!("Rejected upload for disallowed MIME type: {}", mime_type);
        return Err(StatusCode::BAD_REQUEST);
    }

    let crud = FileUploadCrud::new(app_state);
    match crud
        .create_for_issue_from_bytes(issue_id, user_id, original_filename, mime_type, bytes)
        .await
    {
        Ok(model) => Ok(Json(model)),
        Err(e) => {
            warn!("Error creating file upload for issue {}: {:?}", issue_id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn list_for_comment(
    Extension(app_state): Extension<AppState>,
    Path(comment_id): Path<i32>,
) -> impl IntoResponse {
    let crud = CommentFileUploadCrud::new(app_state);
    match crud.find_by_comment_id(comment_id).await {
        Ok(mappings) => Ok(Json(mappings)),
        Err(e) => {
            warn!("Error listing uploads for comment {}: {:?}", comment_id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn attach_upload_to_comment(
    Extension(app_state): Extension<AppState>,
    Path((comment_id, file_upload_id)): Path<(i32, i32)>,
) -> impl IntoResponse {
    let crud = CommentFileUploadCrud::new(app_state);
    match crud.create(comment_id, file_upload_id).await {
        Ok(mapping) => Ok(Json(mapping)),
        Err(e) => {
            warn!(
                "Error attaching upload {} to comment {}: {:?}",
                file_upload_id, comment_id, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn detach_upload_from_comment(
    Extension(app_state): Extension<AppState>,
    Path((comment_id, file_upload_id)): Path<(i32, i32)>,
) -> impl IntoResponse {
    let crud = CommentFileUploadCrud::new(app_state);
    match crud.delete(comment_id, file_upload_id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            warn!(
                "Error detaching upload {} from comment {}: {:?}",
                file_upload_id, comment_id, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn file_upload_attach_to_comment(
    Extension(app_state): Extension<AppState>,
    Path((file_upload_id, comment_id)): Path<(i32, i32)>,
) -> impl IntoResponse {
    let crud = CommentFileUploadCrud::new(app_state);
    match crud.create(comment_id, file_upload_id).await {
        Ok(mapping) => Ok(Json(mapping)),
        Err(e) => {
            warn!(
                "Error attaching upload {} to comment {} via uploads route: {:?}",
                file_upload_id, comment_id, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn upload_for_project_note(
    Extension(app_state): Extension<AppState>,
    Path(note_id): Path<i32>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let user_id = app_state
        .user
        .as_ref()
        .expect("user must be set by middleware")
        .id;
    // Ensure project is selected and note exists within it
    let project_note_crud = ProjectNoteCrud::new(app_state.clone());
    let _note = match project_note_crud.find_by_id(note_id).await {
        Ok(Some(n)) => n,
        Ok(None) => return Err(StatusCode::NOT_FOUND),
        Err(e) => {
            info!("Error loading project note {}: {:?}", note_id, e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let (bytes, original_filename, mime_type) =
        match extract_file_from_multipart(&mut multipart).await {
            Ok(t) => t,
            Err(status) => return Err(status),
        };

    if bytes.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    if !is_allowed_mime(&mime_type) {
        warn!("Rejected upload for disallowed MIME type: {}", mime_type);
        return Err(StatusCode::BAD_REQUEST);
    }

    let crud = FileUploadCrud::new(app_state);
    match crud
        .create_for_project_note_from_bytes(note_id, user_id, original_filename, mime_type, bytes)
        .await
    {
        Ok(model) => Ok(Json(model)),
        Err(e) => {
            warn!(
                "Error creating file upload for project note {}: {:?}",
                note_id, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn list_for_issue(
    Extension(app_state): Extension<AppState>,
    Path(issue_id): Path<i32>,
) -> impl IntoResponse {
    // Verify issue belongs to current project
    let project_id = app_state
        .project
        .as_ref()
        .expect("project must be set by middleware")
        .id;
    let issue_crud = IssueCrud::new(app_state.clone());
    let issue = match issue_crud.find_by_id(issue_id).await {
        Ok(Some(i)) => i,
        Ok(None) => return Err(StatusCode::NOT_FOUND),
        Err(e) => {
            info!("Error loading issue {} for list uploads: {:?}", issue_id, e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };
    if issue.project_id != project_id {
        return Err(StatusCode::NOT_FOUND);
    }

    let crud = FileUploadCrud::new(app_state);
    match crud.find_by_issue_id(issue_id).await {
        Ok(uploads) => Ok(Json(uploads)),
        Err(e) => {
            warn!("Error listing uploads for issue {}: {:?}", issue_id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn list_for_project_note(
    Extension(app_state): Extension<AppState>,
    Path(note_id): Path<i32>,
) -> impl IntoResponse {
    let project_note_crud = ProjectNoteCrud::new(app_state.clone());
    let _note = match project_note_crud.find_by_id(note_id).await {
        Ok(Some(n)) => n,
        Ok(None) => return Err(StatusCode::NOT_FOUND),
        Err(e) => {
            info!(
                "Error loading project note {} for list uploads: {:?}",
                note_id, e
            );
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let crud = FileUploadCrud::new(app_state);
    match crud.find_by_project_note_id(note_id).await {
        Ok(uploads) => Ok(Json(uploads)),
        Err(e) => {
            warn!(
                "Error listing uploads for project note {}: {:?}",
                note_id, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn download_upload(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    // Middleware enforces auth and project selection
    let project_id = app_state
        .project
        .as_ref()
        .expect("project must be set by middleware")
        .id;

    let crud = FileUploadCrud::new(app_state.clone());
    let upload = match crud.find_by_id(id).await {
        Ok(Some(u)) => u,
        Ok(None) => return Err(StatusCode::NOT_FOUND),
        Err(e) => {
            info!("Error loading upload {}: {:?}", id, e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Determine owning project via association
    if let Some(issue_id) = upload.issue_id {
        let issue_crud = IssueCrud::new(app_state.clone());
        match issue_crud.find_by_id(issue_id).await {
            Ok(Some(issue)) if issue.project_id == project_id => {}
            Ok(Some(_)) => return Err(StatusCode::NOT_FOUND), // different project
            Ok(None) => return Err(StatusCode::NOT_FOUND),
            Err(e) => {
                info!("Error checking issue for upload {}: {:?}", id, e);
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        }
    } else if let Some(note_id) = upload.project_note_id {
        let note_crud = ProjectNoteCrud::new(app_state.clone());
        match note_crud.find_by_id(note_id).await {
            Ok(Some(_)) => {}
            Ok(None) => return Err(StatusCode::NOT_FOUND),
            Err(e) => {
                info!("Error checking project note for upload {}: {:?}", id, e);
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        }
    } else {
        // Invalid data state
        warn!("Upload {} has no association", id);
        return Err(StatusCode::NOT_FOUND);
    }

    // Only local backend download is implemented here per current store implementation
    match env::var("FILE_STORE_SCHEME") {
        Ok(scheme) if scheme == "local" => {
            let base = match env::var("BASE_FILE_PATH") {
                Ok(b) => b,
                Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
            };
            let full_path: PathBuf = PathBuf::from(&base).join(&upload.path);
            match tokio::fs::read(full_path).await {
                Ok(bytes) => {
                    let ct = HeaderValue::from_str(&upload.mime_type)
                        .unwrap_or(HeaderValue::from_static("application/octet-stream"));
                    Ok(([(CONTENT_TYPE, ct)], bytes).into_response())
                }
                Err(e) => {
                    warn!("Failed to read local file for upload {}: {:?}", id, e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        Ok(scheme) if scheme == "aws" => {
            // AWS presign not implemented in current FileStore; return 501 for now
            Err(StatusCode::NOT_IMPLEMENTED)
        }
        _ => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[axum::debug_handler]
async fn delete_upload(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let project_id = app_state
        .project
        .as_ref()
        .expect("project must be set by middleware")
        .id;

    // Anti-enumeration: check association before deleting
    let crud = FileUploadCrud::new(app_state.clone());
    let upload = match crud.find_by_id(id).await {
        Ok(Some(u)) => u,
        Ok(None) => return Ok(StatusCode::NO_CONTENT), // Idempotent per spec
        Err(e) => {
            info!("Error loading upload {} for delete: {:?}", id, e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // If associated to issue, verify same project; if project note, verify it exists in project
    if let Some(issue_id) = upload.issue_id {
        let issue_crud = IssueCrud::new(app_state.clone());
        if let Ok(Some(issue)) = issue_crud.find_by_id(issue_id).await {
            if issue.project_id != project_id {
                return Err(StatusCode::NOT_FOUND);
            }
        } else {
            // If owning resource vanished, treat as not found
            return Err(StatusCode::NOT_FOUND);
        }
    } else if let Some(note_id) = upload.project_note_id {
        let note_crud = ProjectNoteCrud::new(app_state.clone());
        if let Ok(Some(_)) = note_crud.find_by_id(note_id).await {
            // ok, already project-filtered
        } else {
            return Err(StatusCode::NOT_FOUND);
        }
    }

    match crud.delete(id).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            warn!("Error deleting upload {}: {:?}", id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// ---------------- Helpers ----------------

async fn extract_file_from_multipart(
    multipart: &mut Multipart,
) -> Result<(Vec<u8>, String, String), StatusCode> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() == Some("file") {
            let original_filename = field
                .file_name()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "upload.bin".to_string());
            let mime_type = field
                .content_type()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let bytes = field
                .bytes()
                .await
                .map_err(|_| StatusCode::BAD_REQUEST)?
                .to_vec();
            return Ok((bytes, original_filename, mime_type));
        }
    }
    Err(StatusCode::BAD_REQUEST)
}

fn is_allowed_mime(mime: &str) -> bool {
    matches!(
        mime,
        "application/pdf"
            | "text/plain"
            | "image/png"
            | "image/jpeg"
            | "image/jpg"
            | "image/svg+xml"
            | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            | "application/msword"
            | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            | "application/vnd.ms-excel"
            | "application/json"
            | "text/markdown"
    )
}
