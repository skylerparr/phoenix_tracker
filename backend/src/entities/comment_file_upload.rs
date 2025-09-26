use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "comment_file_upload")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub comment_id: i32,
    #[sea_orm(primary_key)]
    pub file_upload_id: i32,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::comment::Entity",
        from = "Column::CommentId",
        to = "super::comment::Column::Id"
    )]
    Comment,

    #[sea_orm(
        belongs_to = "super::file_upload::Entity",
        from = "Column::FileUploadId",
        to = "super::file_upload::Column::Id"
    )]
    FileUpload,
}

impl Related<super::comment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Comment.def()
    }
}

impl Related<super::file_upload::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::FileUpload.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
