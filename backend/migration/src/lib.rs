pub use sea_orm_migration::prelude::*;

mod m20240101_000001_create_owner_and_user;
mod m20240102_000001_add_lock_version_to_tasks;
mod m20240103_000001_add_accepted_at_to_issues;
mod m20240520_000001_create_project_notes_table;
mod m20250319_000001_add_missing_indexes;
mod m20250527_202325_alter_notifications;
mod m20250603_201757_add_lock_version_to_comments;
mod m20250604_000001_drop_token_table;
mod m20250604_000002_drop_user_setting_table;
mod m20250926_164833_create_file_uploads_table;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20240101_000001_create_owner_and_user::Migration),
            Box::new(m20240102_000001_add_lock_version_to_tasks::Migration),
            Box::new(m20240103_000001_add_accepted_at_to_issues::Migration),
            Box::new(m20240520_000001_create_project_notes_table::Migration),
            Box::new(m20250319_000001_add_missing_indexes::Migration),
            Box::new(m20250527_202325_alter_notifications::Migration),
            Box::new(m20250603_201757_add_lock_version_to_comments::Migration),
            Box::new(m20250604_000001_drop_token_table::Migration),
            Box::new(m20250604_000002_drop_user_setting_table::Migration),
            Box::new(m20250926_164833_create_file_uploads_table::Migration),
        ]
    }
}
