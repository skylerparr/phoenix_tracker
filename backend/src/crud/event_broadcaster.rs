use serde_json::Value;
use std::sync::Arc;
use tokio::sync::broadcast::Sender;
use tracing::debug;

pub struct EventBroadcaster {
    tx: Arc<Sender<String>>,
}

pub const ISSUE_CREATED: &str = "issue_created";
pub const ISSUE_UPDATED: &str = "issue_updated";
pub const ISSUE_DELETED: &str = "issue_deleted";

pub const TAG_CREATED: &str = "tag_created";
pub const TAG_UPDATED: &str = "tag_updated";
pub const TAG_DELETED: &str = "tag_deleted";

pub const PROJECT_NOTE_CREATED: &str = "project_note_created";
pub const PROJECT_NOTE_UPDATED: &str = "project_note_updated";
pub const PROJECT_NOTE_DELETED: &str = "project_note_deleted";

impl EventBroadcaster {
    pub fn new(tx: Arc<Sender<String>>) -> Self {
        Self { tx }
    }

    pub fn broadcast_event(&self, project_id: i32, event_type: &str, data: Value) {
        let event = serde_json::json!({
            "project_id": project_id,
            "event_type": event_type,
            "data": data
        });

        debug!(
            "Event payload: {}",
            serde_json::to_string_pretty(&event).unwrap()
        );

        match self.tx.send(serde_json::to_string(&event).unwrap()) {
            Ok(_) => debug!("Event broadcast successful"),
            Err(e) => debug!("Failed to broadcast event: {:?}", e),
        }
    }
}
