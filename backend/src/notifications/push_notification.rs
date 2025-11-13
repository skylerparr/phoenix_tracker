use crate::crud::issue::IssueCrud;
use crate::{AppState, WorkerAppState};
use graphile_worker::{IntoTaskHandlerResult, TaskHandler, WorkerContext};
use serde::{Deserialize, Serialize};

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
        let issue_crud = IssueCrud::new(app_state);

        match issue_crud.find_by_id(self.issue_id).await {
            Ok(Some(issue)) => {
                println!("Sending push notification for issue: {}", issue.title);
                Ok::<(), String>(())
            }
            Ok(None) => Err(format!("Issue with ID {} not found", self.issue_id)),
            Err(e) => Err(format!("Database error: {}", e)),
        }
    }
}
