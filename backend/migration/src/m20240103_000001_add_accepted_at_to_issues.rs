use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Issue::Table)
                    .add_column(
                        ColumnDef::new(Issue::AcceptedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_accepted_at")
                    .table(Issue::Table)
                    .col(Issue::AcceptedAt)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_accepted_at")
                    .table(Issue::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Issue::Table)
                    .drop_column(Issue::AcceptedAt)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Issue {
    Table,
    AcceptedAt,
}
