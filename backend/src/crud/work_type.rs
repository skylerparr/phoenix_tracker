use lazy_static::lazy_static;
use std::collections::HashMap;

pub const WORK_TYPE_FEATURE: i32 = 1;
pub const WORK_TYPE_BUG: i32 = 2;
pub const WORK_TYPE_CHORE: i32 = 3;
pub const WORK_TYPE_REMINDER: i32 = 4;

lazy_static! {
    pub static ref WORK_TYPE_MAP: HashMap<i32, &'static str> = {
        let mut m = HashMap::new();
        m.insert(WORK_TYPE_FEATURE, "feature");
        m.insert(WORK_TYPE_BUG, "bug");
        m.insert(WORK_TYPE_CHORE, "chore");
        m.insert(WORK_TYPE_REMINDER, "reminder");
        m
    };
}
