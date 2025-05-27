use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "notification")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub title: String,
    pub description: String,
    pub project_id: i32,
    pub issue_id: i32,
    pub initiated_by_user_id: i32,
    pub targeted_user_id: i32,
    pub read: bool,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::project::Entity",
        from = "Column::ProjectId",
        to = "super::project::Column::Id"
    )]
    Project,
    #[sea_orm(
        belongs_to = "super::issue::Entity",
        from = "Column::IssueId",
        to = "super::issue::Column::Id"
    )]
    Issue,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::InitiatedByUserId",
        to = "super::user::Column::Id"
    )]
    InitiatedByUser,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::TargetedUserId",
        to = "super::user::Column::Id"
    )]
    TargetedUser,
}

impl ActiveModelBehavior for ActiveModel {}
