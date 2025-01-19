use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "issue_tag")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub issue_id: i32,
    #[sea_orm(primary_key)]
    pub tag_id: i32,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}
#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::issue::Entity",
        from = "Column::IssueId",
        to = "super::issue::Column::Id"
    )]
    Issue,
    #[sea_orm(
        belongs_to = "super::tag::Entity",
        from = "Column::TagId",
        to = "super::tag::Column::Id"
    )]
    Tag,
}

impl Related<super::issue::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Issue.def()
    }
}

impl Related<super::tag::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Tag.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
