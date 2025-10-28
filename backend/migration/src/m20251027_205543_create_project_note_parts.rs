use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create project_note_parts table with fields to store a serialized Markdown AST
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
                    // Parent pointer within the same table (tree structure)
                    .col(
                        ColumnDef::new(ProjectNoteParts::ParentId)
                            .integer()
                            .null(),
                    )
                    // Sibling order for deterministic reconstruction
                    .col(
                        ColumnDef::new(ProjectNoteParts::Idx)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    // Node kind (Document, Paragraph, Text, List, Heading, Link, ...)
                    .col(
                        ColumnDef::new(ProjectNoteParts::PartType)
                            .text()
                            .not_null(),
                    )
                    // Optional textual content (e.g., for Text/Code nodes)
                    .col(
                        ColumnDef::new(ProjectNoteParts::Content)
                            .text()
                            .null(),
                    )
                    // Optional opaque JSON string with node-specific attributes (heading level, list props, link url, etc.)
                    .col(
                        ColumnDef::new(ProjectNoteParts::Data)
                            .text()
                            .null(),
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
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_project_note_parts_parent")
                            .from(ProjectNoteParts::Table, ProjectNoteParts::ParentId)
                            .to(ProjectNoteParts::Table, ProjectNoteParts::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Indexes to support fast lookups and ordered tree reconstruction
        manager
            .create_index(
                Index::create()
                    .name("idx_project_note_parts_project_note_id")
                    .table(ProjectNoteParts::Table)
                    .col(ProjectNoteParts::ProjectNoteId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_project_note_parts_parent_id")
                    .table(ProjectNoteParts::Table)
                    .col(ProjectNoteParts::ParentId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_project_note_parts_note_parent_idx")
                    .table(ProjectNoteParts::Table)
                    .col(ProjectNoteParts::ProjectNoteId)
                    .col(ProjectNoteParts::ParentId)
                    .col(ProjectNoteParts::Idx)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first, then the table
        manager
            .drop_index(
                Index::drop()
                    .name("idx_project_note_parts_note_parent_idx")
                    .table(ProjectNoteParts::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_project_note_parts_parent_id")
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
    ParentId,
    Idx,
    PartType,
    Content,
    Data,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ProjectNotes {
    Table,
    Id,
}
