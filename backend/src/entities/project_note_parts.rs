use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "project_note_parts")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub project_note_id: i32,
    pub parent_id: Option<i32>,
    pub idx: i32,
    pub part_type: String,
    pub content: Option<String>,
    pub data: Option<String>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::project_note::Entity",
        from = "Column::ProjectNoteId",
        to = "super::project_note::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    ProjectNote,

    #[sea_orm(
        belongs_to = "Entity",
        from = "Column::ParentId",
        to = "Column::Id",
        on_update = "Cascade",
        on_delete = "SetNull"
    )]
    Parent,
}

// Define the reverse relation (children) manually by reversing `Parent`
impl Related<Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Parent.def().rev()
    }
}

// Define relation back to ProjectNote
impl Related<super::project_note::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ProjectNote.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
