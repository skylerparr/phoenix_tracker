use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ProjectNoteWithParts {
    pub id: i32,
    pub title: String,
    pub parts: Vec<super::project_note_parts::Model>,
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "project_note_tag")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub project_note_part_id: i32,
    pub project_id: i32,
    pub tag_name: String,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
    #[sea_orm(ignore)]
    pub project_note_parts: Vec<ProjectNoteWithParts>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::project_note_parts::Entity",
        from = "Column::ProjectNotePartId",
        to = "super::project_note_parts::Column::Id"
    )]
    ProjectNoteParts,
    #[sea_orm(
        belongs_to = "super::project::Entity",
        from = "Column::ProjectId",
        to = "super::project::Column::Id"
    )]
    Project,
}

impl Related<super::project_note_parts::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ProjectNoteParts.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
