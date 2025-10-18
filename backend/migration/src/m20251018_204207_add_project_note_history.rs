use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create project_note_history table
        manager
            .create_table(
                Table::create()
                    .table(ProjectNoteHistory::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ProjectNoteHistory::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteHistory::ProjectNoteId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteHistory::Action)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteHistory::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteHistory::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteHistory::UserId)
                            .integer()
                            .null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_project_note_history_project_note")
                            .from(
                                ProjectNoteHistory::Table,
                                ProjectNoteHistory::ProjectNoteId,
                            )
                            .to(ProjectNotes::Table, ProjectNotes::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_project_note_history_user")
                            .from(
                                ProjectNoteHistory::Table,
                                ProjectNoteHistory::UserId,
                            )
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Index on project_note_id
        manager
            .create_index(
                Index::create()
                    .name("idx_project_note_history_project_note_id")
                    .table(ProjectNoteHistory::Table)
                    .col(ProjectNoteHistory::ProjectNoteId)
                    .to_owned(),
            )
            .await?;

        // Index on user_id for fast lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_project_note_history_user_id")
                    .table(ProjectNoteHistory::Table)
                    .col(ProjectNoteHistory::UserId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first, then table
        manager
            .drop_index(
                Index::drop()
                    .name("idx_project_note_history_project_note_id")
                    .table(ProjectNoteHistory::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_project_note_history_user_id")
                    .table(ProjectNoteHistory::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(ProjectNoteHistory::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum ProjectNoteHistory {
    Table,
    Id,
    ProjectNoteId,
    Action,
    CreatedAt,
    UpdatedAt,
    UserId,
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
