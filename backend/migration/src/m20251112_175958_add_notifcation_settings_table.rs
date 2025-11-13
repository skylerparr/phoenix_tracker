use crate::sea_orm::DatabaseBackend;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create table
        manager
            .create_table(
                Table::create()
                    .table(NotificationSettings::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(NotificationSettings::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(NotificationSettings::ProjectId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(NotificationSettings::ApplicationId)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(NotificationSettings::Token)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(NotificationSettings::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(NotificationSettings::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_notification_settings_project")
                            .from(NotificationSettings::Table, NotificationSettings::ProjectId)
                            .to(Project::Table, Project::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_notification_settings_project_id")
                    .table(NotificationSettings::Table)
                    .col(NotificationSettings::ProjectId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_notification_settings_application_project_unique")
                    .table(NotificationSettings::Table)
                    .col(NotificationSettings::ApplicationId)
                    .col(NotificationSettings::ProjectId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Add updated_at trigger
        let table = "notification_settings";
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
        // Drop indexes first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_notification_settings_application_project_unique")
                    .table(NotificationSettings::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_notification_settings_project_id")
                    .table(NotificationSettings::Table)
                    .to_owned(),
            )
            .await?;

        // Drop the table
        manager
            .drop_table(Table::drop().table(NotificationSettings::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum NotificationSettings {
    Table,
    Id,
    ProjectId,
    ApplicationId,
    Token,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Project {
    Table,
    Id,
}
