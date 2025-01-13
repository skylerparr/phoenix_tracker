use sea_orm::entity::prelude::*;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize)]
#[sea_orm(table_name = "issue")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub title: String,
    pub description: Option<String>,
    pub priority: i32,
    pub points: Option<i32>,
    pub status: i32,
    pub is_icebox: bool,
    pub work_type: i32,
    pub project_id: i32,
    pub created_by_id: i32,
    pub target_release_at: Option<DateTimeWithTimeZone>,
    pub lock_version: i32,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
    #[sea_orm(ignore)]
    pub issue_tag_ids: Vec<i32>,
    #[sea_orm(ignore)]
    pub scheduled_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
