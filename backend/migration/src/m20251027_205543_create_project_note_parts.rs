use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create project_note_parts table
        manager
            .create_table(
                Table::create()
                    .table(ProjectNoteParts::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ProjectNoteParts::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteParts::ProjectNoteId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteParts::PartType)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteParts::Content)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteParts::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteParts::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_project_note_parts_project_note")
                            .from(ProjectNoteParts::Table, ProjectNoteParts::ProjectNoteId)
                            .to(ProjectNotes::Table, ProjectNotes::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Index on project_note_id for fast lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_project_note_parts_project_note_id")
                    .table(ProjectNoteParts::Table)
                    .col(ProjectNoteParts::ProjectNoteId)
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
                    .name("idx_project_note_parts_project_note_id_order")
                    .table(ProjectNoteParts::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_project_note_parts_project_note_id")
                    .table(ProjectNoteParts::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(ProjectNoteParts::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum ProjectNoteParts {
    Table,
    Id,
    ProjectNoteId,
    PartType,
    Content,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ProjectNotes {
    Table,
    Id,
}
