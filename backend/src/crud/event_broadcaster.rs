use serde_json::Value;
use std::sync::Arc;
use tokio::sync::broadcast::Sender;
use tracing::{debug, error, info, warn};

pub struct EventBroadcaster {
    tx: Arc<Sender<String>>,
}

pub const ISSUE_CREATED: &str = "issue_created";
pub const ISSUE_UPDATED: &str = "issue_updated";
pub const ISSUE_DELETED: &str = "issue_deleted";

pub const TAG_CREATED: &str = "tag_created";
pub const TAG_UPDATED: &str = "tag_updated";
pub const TAG_DELETED: &str = "tag_deleted";

pub const PROJECT_NOTE_PART_UPDATED: &str = "project_note_part_updated";

pub const PROJECT_NOTE_CREATED: &str = "project_note_created";
pub const PROJECT_NOTE_UPDATED: &str = "project_note_updated";
pub const PROJECT_NOTE_DELETED: &str = "project_note_deleted";

pub const REMINDER_DISPATCHED: &str = "reminder_dispatched";

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

        let event_json = match serde_json::to_string(&event) {
            Ok(json) => json,
            Err(e) => {
                error!(
                    "Failed to serialize event for project {}: {:?}",
                    project_id, e
                );
                return;
            }
        };

        debug!(
            "Broadcasting event '{}' for project {}: {}",
            event_type, project_id, event_json
        );

        // Get current subscriber count for monitoring
        let subscriber_count = self.tx.receiver_count();
        info!(
            "Broadcasting {} event to {} subscribers for project {}",
            event_type, subscriber_count, project_id
        );

        match self.tx.send(event_json) {
            Ok(subscriber_count) => {
                info!(
                    "Event '{}' broadcast successful to {} subscribers for project {}",
                    event_type, subscriber_count, project_id
                );
            }
            Err(e) => {
                warn!(
                    "Failed to broadcast event '{}' for project {}: {:?} (subscribers: {})",
                    event_type, project_id, e, subscriber_count
                );

                error!(
                    "Broadcast channel is full! Consider increasing WEBSOCKET_BUFFER_SIZE. \
                    Current subscribers: {}, Event: {} for project {}",
                    subscriber_count, event_type, project_id
                );
            }
        }
    }
}
