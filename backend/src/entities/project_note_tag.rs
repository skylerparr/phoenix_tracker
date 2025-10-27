use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

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

impl ActiveModelBehavior for ActiveModel {}
