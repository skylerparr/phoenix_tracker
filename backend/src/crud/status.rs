use lazy_static::lazy_static;
use std::collections::HashMap;

pub struct Status {
    pub id: i32,
    pub name: String,
}

lazy_static! {
    static ref STATUS_MAP: HashMap<i32, &'static str> = {
        let mut map = HashMap::new();
        map.insert(0, "Ready");
        map.insert(1, "In Progress");
        map.insert(2, "Completed");
        map.insert(3, "Rejected");
        map.insert(4, "Accepted");
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

pub fn get_status_map() -> HashMap<i32, &'static str> {
    STATUS_MAP.clone()
}

pub fn get_unfinished_statuses() -> Vec<i32> {
    STATUS_MAP
        .iter()
        .filter(|(&id, _)| id != 5)
        .map(|(&id, _)| id)
        .collect()
}

pub fn get_status_id_by_name(name: &str) -> Option<i32> {
    STATUS_MAP
        .iter()
        .find(|(_, &status_name)| status_name == name)
        .map(|(&id, _)| id)
}
