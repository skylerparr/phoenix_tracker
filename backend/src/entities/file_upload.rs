use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "file_upload")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub issue_id: Option<i32>,
    pub project_note_id: Option<i32>,
    pub uploader_user_id: i32,
    pub original_filename: String,
    pub final_filename: String,
    pub path: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub uploaded_at: DateTimeWithTimeZone,

    // Full browser-accessible URL (local: backend download route; aws: presigned S3 URL)
    #[sea_orm(ignore)]
    pub full_url: Option<String>,
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
        belongs_to = "super::project_note::Entity",
        from = "Column::ProjectNoteId",
        to = "super::project_note::Column::Id"
    )]
    ProjectNote,

    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UploaderUserId",
        to = "super::user::Column::Id"
    )]
    UploaderUser,

    #[sea_orm(
        has_many = "super::comment_file_upload::Entity",
        from = "Column::Id",
        to = "super::comment_file_upload::Column::FileUploadId"
    )]
    CommentFileUpload,
}

impl Related<super::issue::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Issue.def()
    }
}

impl Related<super::project_note::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ProjectNote.def()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::UploaderUser.def()
    }
}

impl Related<super::comment_file_upload::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::CommentFileUpload.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
