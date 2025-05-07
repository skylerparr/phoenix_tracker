use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
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
    pub accepted_at: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
    #[sea_orm(ignore)]
    pub issue_tag_ids: Vec<i32>,
    #[sea_orm(ignore)]
    pub scheduled_at: Option<DateTimeWithTimeZone>,
    #[sea_orm(ignore)]
    pub issue_assignee_ids: Vec<i32>,
}
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::project::Entity",
        from = "Column::ProjectId",
        to = "super::project::Column::Id"
    )]
    Project,
}
impl Related<super::project::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Project.def()
    }
}
impl ActiveModelBehavior for ActiveModel {}
