use crate::sea_orm::DatabaseBackend;
use sea_orm;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create file_upload table
        manager
            .create_table(
                Table::create()
                    .table(FileUpload::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(FileUpload::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(FileUpload::IssueId).integer())
                    .col(ColumnDef::new(FileUpload::ProjectNoteId).integer())
                    .col(
                        ColumnDef::new(FileUpload::UploaderUserId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(FileUpload::OriginalFilename)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(FileUpload::FinalFilename)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(FileUpload::Path).string().not_null())
                    .col(ColumnDef::new(FileUpload::MimeType).string().not_null())
                    .col(
                        ColumnDef::new(FileUpload::SizeBytes)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(FileUpload::UploadedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_file_upload_issue")
                            .from(FileUpload::Table, FileUpload::IssueId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_file_upload_project_note")
                            .from(FileUpload::Table, FileUpload::ProjectNoteId)
                            .to(ProjectNotes::Table, ProjectNotes::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_file_upload_uploader_user")
                            .from(FileUpload::Table, FileUpload::UploaderUserId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Indexes per spec
        manager
            .create_index(
                Index::create()
                    .name("idx_file_upload_issue_id")
                    .table(FileUpload::Table)
                    .col(FileUpload::IssueId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_file_upload_project_note_id")
                    .table(FileUpload::Table)
                    .col(FileUpload::ProjectNoteId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_file_upload_uploader_user_id")
                    .table(FileUpload::Table)
                    .col(FileUpload::UploaderUserId)
                    .to_owned(),
            )
            .await?;

        // Check constraint: exactly one association must be present
        match manager.get_database_backend() {
            DatabaseBackend::Postgres => {
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        r#"ALTER TABLE "file_upload"
                           ADD CONSTRAINT chk_file_upload_one_assoc
                           CHECK ((issue_id IS NOT NULL) <> (project_note_id IS NOT NULL));"#
                            .to_owned(),
                    ))
                    .await?;
            }
            DatabaseBackend::MySql => {
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        r#"ALTER TABLE file_upload
                           ADD CONSTRAINT chk_file_upload_one_assoc
                           CHECK ((issue_id IS NOT NULL) <> (project_note_id IS NOT NULL));"#
                            .to_owned(),
                    ))
                    .await?;
            }
            DatabaseBackend::Sqlite => {
                // SQLite cannot add CHECK constraints after table creation. Enforce in application or via triggers if needed.
            }
        }

        // Create link table: one Comment -> many FileUploads (each FileUpload linked to at most one Comment)
        manager
            .create_table(
                Table::create()
                    .table(CommentFileUpload::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(CommentFileUpload::CommentId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CommentFileUpload::FileUploadId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CommentFileUpload::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(CommentFileUpload::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .primary_key(
                        Index::create()
                            .col(CommentFileUpload::CommentId)
                            .col(CommentFileUpload::FileUploadId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_comment_file_upload_comment")
                            .from(CommentFileUpload::Table, CommentFileUpload::CommentId)
                            .to(Comment::Table, Comment::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_comment_file_upload_upload")
                            .from(CommentFileUpload::Table, CommentFileUpload::FileUploadId)
                            .to(FileUpload::Table, FileUpload::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Enforce one-to-many by making file_upload_id unique in the link table
        manager
            .create_index(
                Index::create()
                    .name("idx_comment_file_upload_unique_upload")
                    .table(CommentFileUpload::Table)
                    .col(CommentFileUpload::FileUploadId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Ensure project_notes.project_id -> project.id uses (drop and recreate FK if needed)
        match manager.get_database_backend() {
            DatabaseBackend::Postgres => {
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        r#"ALTER TABLE "project_notes" DROP CONSTRAINT IF EXISTS "fk_project_notes_project";"#
                            .to_owned(),
                    ))
                    .await?;
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        r#"ALTER TABLE "project_notes"
                           ADD CONSTRAINT "fk_project_notes_project"
                           FOREIGN KEY ("project_id") REFERENCES "project" ("id");"#
                            .to_owned(),
                    ))
                    .await?;
            }
            DatabaseBackend::MySql => {
                // MySQL requires dropping the foreign key by name, then re-adding with
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        "ALTER TABLE project_notes DROP FOREIGN KEY fk_project_notes_project;"
                            .to_owned(),
                    ))
                    .await
                    .ok(); // ignore if it doesn't exist
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        "ALTER TABLE project_notes ADD CONSTRAINT fk_project_notes_project FOREIGN KEY (project_id) REFERENCES project(id);".to_owned(),
                    ))
                    .await?;
            }
            DatabaseBackend::Sqlite => {
                // SQLite cannot alter existing FKs in place; requires table rebuild. Skipping.
            }
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop link table first to satisfy FKs
        manager
            .drop_index(
                Index::drop()
                    .name("idx_comment_file_upload_unique_upload")
                    .table(CommentFileUpload::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(Table::drop().table(CommentFileUpload::Table).to_owned())
            .await?;

        // Drop indexes first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_file_upload_uploader_user_id")
                    .table(FileUpload::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx_file_upload_project_note_id")
                    .table(FileUpload::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx_file_upload_issue_id")
                    .table(FileUpload::Table)
                    .to_owned(),
            )
            .await?;

        // Drop check constraint if supported
        match manager.get_database_backend() {
            DatabaseBackend::Postgres => {
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        r#"ALTER TABLE "file_upload" DROP CONSTRAINT IF EXISTS chk_file_upload_one_assoc;"#
                            .to_owned(),
                    ))
                    .await?;
            }
            DatabaseBackend::MySql => {
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        r#"ALTER TABLE file_upload DROP CHECK chk_file_upload_one_assoc;"#
                            .to_owned(),
                    ))
                    .await?;
            }
            DatabaseBackend::Sqlite => {}
        }

        // Finally, drop the table
        manager
            .drop_table(Table::drop().table(FileUpload::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum FileUpload {
    Table,
    Id,
    IssueId,
    ProjectNoteId,
    UploaderUserId,
    OriginalFilename,
    FinalFilename,
    Path,
    MimeType,
    SizeBytes,
    UploadedAt,
}

#[derive(DeriveIden)]
enum Issue {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum ProjectNotes {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum CommentFileUpload {
    Table,
    CommentId,
    FileUploadId,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Comment {
    Table,
    Id,
}
