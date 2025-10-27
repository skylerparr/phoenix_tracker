use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "project_note_parts")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub project_note_id: i32,
    pub part_type: String,
    pub content: String,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::project_note::Entity",
        from = "Column::ProjectNoteId",
        to = "super::project_note::Column::Id"
    )]
    ProjectNote,
}

impl ActiveModelBehavior for ActiveModel {}
