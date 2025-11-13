use crate::crud::issue::IssueCrud;
use crate::crud::notification_settings::NotificationSettingsCrud;
use crate::crud::status::STATUS_ACCEPTED;
use crate::crud::status::STATUS_UNSTARTED;
use crate::crud::user::UserCrud;
use crate::crud::work_type::WORK_TYPE_REMINDER;
use crate::notifications::gotify::GotifyClient;
use crate::{AppState, WorkerAppState};
use chrono::Utc;
use graphile_worker::{IntoTaskHandlerResult, TaskHandler, WorkerContext};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

#[derive(Deserialize, Serialize)]
pub struct PushNotification {
    pub issue_id: i32,
}

impl TaskHandler for PushNotification {
    const IDENTIFIER: &'static str = "push_notification";

    async fn run(self, ctx: WorkerContext) -> impl IntoTaskHandlerResult {
        // Access the shared worker extension and construct an AppState for CRUD
        let worker_state = ctx
            .get_ext::<WorkerAppState>()
            .ok_or_else(|| "Missing WorkerAppState extension".to_string())?
            .clone();
        let app_state = AppState {
            db: worker_state.db.0.clone(),
            tx: worker_state.tx.0.clone(),
            user: None,
            project: None,
            bearer_token: None,
            worker: None,
        };
        let issue_crud = IssueCrud::new(app_state.clone());

        match issue_crud.find_by_id(self.issue_id).await {
            Ok(Some(issue)) => {
                if issue.work_type != WORK_TYPE_REMINDER || issue.status != STATUS_UNSTARTED {
                    return Ok(());
                }

                info!("Sending push notification for issue: {}", issue.title);

                // Fetch the user who created the issue
                let user_crud = UserCrud::new(app_state.clone());
                let user = match user_crud.find_by_id(issue.created_by_id).await {
                    Ok(Some(user)) => user,
                    Ok(None) => {
                        error!("User with ID {} not found", issue.created_by_id);
                        return Err(format!("User with ID {} not found", issue.created_by_id));
                    }
                    Err(e) => {
                        error!("Failed to fetch user: {}", e);
                        return Err(format!("Failed to fetch user: {}", e));
                    }
                };

                let app_state_with_user = AppState {
                    db: worker_state.db.0.clone(),
                    tx: worker_state.tx.0.clone(),
                    user: Some(user),
                    project: None,
                    bearer_token: None,
                    worker: None,
                };
                let issue_crud_with_user = IssueCrud::new(app_state_with_user.clone());

                // Create a new GotifyClient instance
                let gotify_client = GotifyClient::new();

                // Get notification settings by project_id
                let notification_crud = NotificationSettingsCrud::new(app_state);
                match notification_crud.find_by_project_id(issue.project_id).await {
                    Ok(Some(settings)) => {
                        // Send notification with issue title and description
                        let description =
                            issue.description.clone().unwrap_or_else(|| "".to_string());
                        let message = if description.is_empty() {
                            issue.title.clone()
                        } else {
                            description
                        };
                        match gotify_client
                            .send_simple_notification(settings.token, issue.title.clone(), message)
                            .await
                        {
                            Ok(_) => {
                                // Update issue status to ACCEPTED and set accepted_at
                                let now = Utc::now();
                                match issue_crud_with_user
                                    .update(
                                        issue.id,
                                        None,
                                        None,
                                        None,
                                        None,
                                        Some(STATUS_ACCEPTED),
                                        None,
                                        None,
                                        None,
                                        Some(now.into()),
                                    )
                                    .await
                                {
                                    Ok(_) => Ok::<(), String>(()),
                                    Err(e) => {
                                        error!("Failed to update issue status to ACCEPTED: {}", e);
                                        Err(format!("Failed to update issue status: {}", e))
                                    }
                                }
                            }
                            Err(e) => {
                                error!("Failed to send Gotify notification: {}", e);
                                Err(format!("Failed to send notification: {}", e))
                            }
                        }
                    }
                    Ok(None) => {
                        error!(
                            "No notification settings found for project: {}",
                            issue.project_id
                        );
                        Err(format!(
                            "No notification settings for project {}",
                            issue.project_id
                        ))
                    }
                    Err(e) => {
                        error!("Failed to retrieve notification settings: {}", e);
                        Err(format!("Database error: {}", e))
                    }
                }
            }
            Ok(None) => Ok(()),
            Err(e) => Err(format!("Database error: {}", e)),
        }
    }
}
