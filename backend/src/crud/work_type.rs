use lazy_static::lazy_static;
use std::collections::HashMap;

pub struct WorkType {
    pub id: i32,
    pub name: String,
}

pub const WORK_TYPE_FEATURE: i32 = 0;
pub const WORK_TYPE_BUG: i32 = 1;
pub const WORK_TYPE_CHORE: i32 = 2;
pub const WORK_TYPE_RELEASE: i32 = 3;

lazy_static! {
    pub static ref WORK_TYPE_MAP: HashMap<i32, &'static str> = {
        let mut map = HashMap::new();
        map.insert(WORK_TYPE_FEATURE, "Feature");
        map.insert(WORK_TYPE_BUG, "Bug");
        map.insert(WORK_TYPE_CHORE, "Chore");
        map.insert(WORK_TYPE_RELEASE, "Release");
        map
    };
}

pub fn get_work_types() -> Vec<i32> {
    WORK_TYPE_MAP.iter().map(|(&id, _)| id).collect()
}
