use lazy_static::lazy_static;
use std::collections::HashMap;

pub struct Status {
    pub id: i32,
    pub name: String,
}

pub const STATUS_READY: i32 = 0;
pub const STATUS_IN_PROGRESS: i32 = 1;
pub const STATUS_COMPLETED: i32 = 2;
pub const STATUS_REJECTED: i32 = 3;
pub const STATUS_ACCEPTED: i32 = 4;

lazy_static! {
    static ref STATUS_MAP: HashMap<i32, &'static str> = {
        let mut map = HashMap::new();
        map.insert(STATUS_READY, "Ready");
        map.insert(STATUS_IN_PROGRESS, "In Progress");
        map.insert(STATUS_COMPLETED, "Completed");
        map.insert(STATUS_REJECTED, "Rejected");
        map.insert(STATUS_ACCEPTED, "Accepted");
        map
    };
}

pub fn get_status_array() -> Vec<Status> {
    STATUS_MAP
        .iter()
        .map(|(&id, &name)| Status {
            id,
            name: name.to_string(),
        })
        .collect()
}

pub fn get_unfinished_statuses() -> Vec<i32> {
    STATUS_MAP
        .iter()
        .filter(|(&id, _)| id != 5)
        .map(|(&id, _)| id)
        .collect()
}
