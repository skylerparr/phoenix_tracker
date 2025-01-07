use sea_orm::entity::prelude::*;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize)]
#[sea_orm(table_name = "blocker")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub blocker_id: i32,
    #[sea_orm(primary_key)]
    pub blocked_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::issue::Entity",
        from = "Column::BlockerId",
        to = "super::issue::Column::Id"
    )]
    BlockerIssue,
    #[sea_orm(
        belongs_to = "super::issue::Entity",
        from = "Column::BlockedId",
        to = "super::issue::Column::Id"
    )]
    BlockedIssue,
}

impl Related<super::issue::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::BlockerIssue.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
