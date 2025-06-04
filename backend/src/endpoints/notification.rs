use crate::crud::notification::NotificationCrud;
use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, FixedOffset};
use serde::Deserialize;
use tracing::{info, warn};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetNotificationsQuery {
    #[serde(default)]
    pub cursor_created_at: Option<DateTime<FixedOffset>>,
    #[serde(default)]
    pub cursor_id: Option<i32>,
}

pub fn notification_routes() -> Router<AppState> {
    Router::new()
        .route("/notifications", get(get_notifications_for_project))
        .route("/notifications/:id/read", put(mark_notification_as_read))
        .route(
            "/notifications/count",
            get(get_notification_count_for_project),
        )
}
#[axum::debug_handler]
async fn get_notifications_for_project(
    Extension(app_state): Extension<AppState>,
    Query(params): Query<GetNotificationsQuery>,
) -> impl IntoResponse {
    let user_id = match app_state.user.as_ref() {
        Some(user) => user.id,
        None => return Err(StatusCode::UNAUTHORIZED),
    };
    let project_id = match app_state.project.as_ref() {
        Some(project) => project.id,
        None => return Err(StatusCode::BAD_REQUEST), // No project selected
    };

    let notification_crud = NotificationCrud::new(app_state);

    let cursor = match (params.cursor_created_at, params.cursor_id) {
        (Some(created_at), Some(id)) => Some((created_at, id)),
        _ => None,
    };

    match notification_crud
        .get_all_for_project(project_id, user_id, cursor)
        .await
    {
        Ok(notifications) => Ok(Json(notifications)),
        Err(e) => {
            warn!(
                "Error getting notifications for project {}: {:?}",
                project_id, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[axum::debug_handler]
async fn mark_notification_as_read(
    Extension(app_state): Extension<AppState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let notification_crud = NotificationCrud::new(app_state);

    match notification_crud.mark_as_read(id).await {
        Ok(notification) => Ok(Json(notification)),
        Err(e) => {
            if e.to_string().contains("Notification not found") {
                Err(StatusCode::NOT_FOUND)
            } else {
                info!("Error marking notification {} as read: {:?}", id, e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

#[axum::debug_handler]
async fn get_notification_count_for_project(
    Extension(app_state): Extension<AppState>,
) -> impl IntoResponse {
    let user_id = match app_state.user.as_ref() {
        Some(user) => user.id,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // If no project is selected, return 0 count
    let project_id = match app_state.project.as_ref() {
        Some(project) => project.id,
        None => return Ok(Json(0)), // Return 0 when no project is selected
    };

    let notification_crud = NotificationCrud::new(app_state);

    match notification_crud
        .get_unread_count_for_user_and_project(project_id, user_id)
        .await
    {
        Ok(count) => Ok(Json(count)),
        Err(e) => {
            warn!(
                "Error getting notification count for project {}: {:?}",
                project_id, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
