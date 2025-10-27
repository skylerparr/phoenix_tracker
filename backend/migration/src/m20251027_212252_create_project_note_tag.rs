use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create project_note_tag table
        manager
            .create_table(
                Table::create()
                    .table(ProjectNoteTag::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ProjectNoteTag::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteTag::ProjectNotePartId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteTag::ProjectId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteTag::TagName)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteTag::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(ProjectNoteTag::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_project_note_tag_project_note_part")
                            .from(ProjectNoteTag::Table, ProjectNoteTag::ProjectNotePartId)
                            .to(ProjectNoteParts::Table, ProjectNoteParts::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_project_note_tag_project")
                            .from(ProjectNoteTag::Table, ProjectNoteTag::ProjectId)
                            .to(Project::Table, Project::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Index on project_note_part_id for fast lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_project_note_tag_project_note_part_id")
                    .table(ProjectNoteTag::Table)
                    .col(ProjectNoteTag::ProjectNotePartId)
                    .to_owned(),
            )
            .await?;

        // Index on project_id for fast lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_project_note_tag_project_id")
                    .table(ProjectNoteTag::Table)
                    .col(ProjectNoteTag::ProjectId)
                    .to_owned(),
            )
            .await?;

        // Unique index on tag_name
        manager
            .create_index(
                Index::create()
                    .unique()
                    .name("idx_project_note_tag_name_unique")
                    .table(ProjectNoteTag::Table)
                    .col(ProjectNoteTag::ProjectId)
                    .col(ProjectNoteTag::TagName)
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
                    .name("idx_project_note_tag_name_unique")
                    .table(ProjectNoteTag::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_project_note_tag_project_id")
                    .table(ProjectNoteTag::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_project_note_tag_project_note_part_id")
                    .table(ProjectNoteTag::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(ProjectNoteTag::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum ProjectNoteTag {
    Table,
    Id,
    ProjectNotePartId,
    ProjectId,
    TagName,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ProjectNoteParts {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Project {
    Table,
    Id,
}
