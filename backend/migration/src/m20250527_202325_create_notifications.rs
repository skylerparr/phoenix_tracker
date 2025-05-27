use crate::sea_orm::DatabaseBackend;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Notification::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Notification::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(Notification::Title).string().not_null())
                    .col(
                        ColumnDef::new(Notification::Description)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Notification::ProjectId).integer().not_null())
                    .col(ColumnDef::new(Notification::IssueId).integer().not_null())
                    .col(
                        ColumnDef::new(Notification::InitiatedByUserId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Notification::TargetedUserId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Notification::Read)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Notification::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Notification::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-notification-project")
                            .from(Notification::Table, Notification::ProjectId)
                            .to(Project::Table, Project::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-notification-issue")
                            .from(Notification::Table, Notification::IssueId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-notification-initiated-by-user")
                            .from(Notification::Table, Notification::InitiatedByUserId)
                            .to(User::Table, User::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-notification-targeted-user")
                            .from(Notification::Table, Notification::TargetedUserId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on project and read field using string literals
        manager
            .get_connection()
            .execute(sea_orm::Statement::from_string(
                manager.get_database_backend(),
                r#"CREATE INDEX "idx-notification-project-read" ON "notification" ("project_id", "read")"#.to_string(),
            ))
            .await?;

        // Create index on initiated user
        manager
            .get_connection()
            .execute(sea_orm::Statement::from_string(
                manager.get_database_backend(),
                r#"CREATE INDEX "idx-notification-initiated-by-user" ON "notification" ("initiated_by_user_id")"#.to_string(),
            ))
            .await?;

        // Create index on targeted user
        manager
            .get_connection()
            .execute(sea_orm::Statement::from_string(
                manager.get_database_backend(),
                r#"CREATE INDEX "idx-notification-targeted-user" ON "notification" ("targeted_user_id")"#.to_string(),
            ))
            .await?;

        // Create index on issue
        manager
            .get_connection()
            .execute(sea_orm::Statement::from_string(
                manager.get_database_backend(),
                r#"CREATE INDEX "idx-notification-issue" ON "notification" ("issue_id")"#
                    .to_string(),
            ))
            .await?;

        // Add updated_at trigger
        let table = "notification";
        match manager.get_database_backend() {
            DatabaseBackend::Postgres => {
                // First drop existing trigger
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        format!("DROP TRIGGER IF EXISTS set_updated_at ON \"{}\";", table),
                    ))
                    .await?;
                // Then create new trigger
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        format!(
                            r#"CREATE TRIGGER set_updated_at
                                        BEFORE UPDATE ON "{}"
                                        FOR EACH ROW
                                        EXECUTE FUNCTION update_updated_at_column();"#,
                            table
                        ),
                    ))
                    .await?;
            }
            DatabaseBackend::MySql => {
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        format!("DROP TRIGGER IF EXISTS set_updated_at;"),
                    ))
                    .await?;
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        format!(
                            r#"CREATE TRIGGER set_updated_at
                                        BEFORE UPDATE ON "{}"
                                        FOR EACH ROW
                                        SET NEW.updated_at = CURRENT_TIMESTAMP"#,
                            table
                        ),
                    ))
                    .await?;
            }
            DatabaseBackend::Sqlite => {
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        format!("DROP TRIGGER IF EXISTS set_updated_at_{};", table),
                    ))
                    .await?;
                manager
                    .get_connection()
                    .execute(
                        sea_orm::Statement::from_string(
                            manager.get_database_backend(),
                            format!(
                                r#"CREATE TRIGGER set_updated_at_{}
                                    AFTER UPDATE ON {}
                                    FOR EACH ROW
                                    WHEN NEW.updated_at = OLD.updated_at
                                    BEGIN
                                        UPDATE {} SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
                                        WHERE id = NEW.id;
                                    END;"#,
                                table, table, table
                            ),
                        )
                    )
                    .await?;
            }
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Notification::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Notification {
    Table,
    Id,
    Title,
    Description,
    ProjectId,
    IssueId,
    InitiatedByUserId,
    TargetedUserId,
    Read,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Project {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Issue {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}
