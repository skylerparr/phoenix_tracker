use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the user_setting table since project context is now stored in JWT
        manager
            .drop_table(Table::drop().table(UserSetting::Table).to_owned())
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Recreate the user_setting table if we need to rollback
        manager
            .create_table(
                Table::create()
                    .table(UserSetting::Table)
                    .col(
                        ColumnDef::new(UserSetting::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(UserSetting::UserId).integer().not_null())
                    .col(ColumnDef::new(UserSetting::ProjectId).integer())
                    .col(ColumnDef::new(UserSetting::LockVersion).integer())
                    .col(
                        ColumnDef::new(UserSetting::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(UserSetting::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-user-setting-user")
                            .from(UserSetting::Table, UserSetting::UserId)
                            .to(User::Table, User::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-user-setting-project")
                            .from(UserSetting::Table, UserSetting::ProjectId)
                            .to(Project::Table, Project::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Recreate the unique index
        manager
            .create_index(
                Index::create()
                    .name("idx-user-setting-user")
                    .col(UserSetting::UserId)
                    .unique()
                    .table(UserSetting::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum UserSetting {
    Table,
    Id,
    UserId,
    ProjectId,
    LockVersion,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Project {
    Table,
    Id,
}
