use serde_json::Value;
use std::sync::Arc;
use tokio::sync::broadcast::Sender;
use tracing::debug;

pub struct EventBroadcaster {
    tx: Arc<Sender<String>>,
}

impl EventBroadcaster {
    pub fn new(tx: Arc<Sender<String>>) -> Self {
        Self { tx }
    }

    pub fn broadcast_event(&self, project_id: i32, event_type: &str, data: Value) {
        let event = serde_json::json!({
            "project_id": project_id,
            "type": event_type,
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
