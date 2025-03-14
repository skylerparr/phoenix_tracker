use crate::sea_orm::DatabaseBackend;
use sea_orm;
use sea_orm_migration::prelude::*;
use sea_query;

#[derive(DeriveMigrationName)]
pub struct Migration;
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .col(
                        ColumnDef::new(User::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(User::Name).string().not_null())
                    .col(ColumnDef::new(User::Email).string().not_null().unique_key())
                    .col(
                        ColumnDef::new(User::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(User::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(Owner::Table)
                    .col(
                        ColumnDef::new(Owner::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(Owner::UserId).integer().not_null())
                    .col(
                        ColumnDef::new(Owner::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Owner::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-owner-user")
                            .from(Owner::Table, Owner::UserId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Project::Table)
                    .col(
                        ColumnDef::new(Project::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(Project::Name).string().not_null())
                    .col(ColumnDef::new(Project::OwnerId).integer().not_null())
                    .col(
                        ColumnDef::new(Project::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Project::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-project-owner")
                            .from(Project::Table, Project::OwnerId)
                            .to(Owner::Table, Owner::Id),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Tag::Table)
                    .col(
                        ColumnDef::new(Tag::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(Tag::Name).string().not_null())
                    .col(ColumnDef::new(Tag::IsEpic).boolean().not_null())
                    .col(ColumnDef::new(Tag::ProjectId).integer().not_null())
                    .col(
                        ColumnDef::new(Tag::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Tag::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-tag-project")
                            .from(Tag::Table, Tag::ProjectId)
                            .to(Project::Table, Project::Id),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Issue::Table)
                    .col(
                        ColumnDef::new(Issue::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(Issue::Title).string().not_null())
                    .col(ColumnDef::new(Issue::Description).string())
                    .col(ColumnDef::new(Issue::Priority).integer().not_null())
                    .col(ColumnDef::new(Issue::Points).integer())
                    .col(ColumnDef::new(Issue::Status).integer().not_null())
                    .col(
                        ColumnDef::new(Issue::IsIcebox)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(Issue::WorkType).integer().not_null())
                    .col(ColumnDef::new(Issue::ProjectId).integer().not_null())
                    .col(ColumnDef::new(Issue::CreatedById).integer().not_null())
                    .col(ColumnDef::new(Issue::TargetReleaseAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Issue::LockVersion)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Issue::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Issue::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-issue-project")
                            .from(Issue::Table, Issue::ProjectId)
                            .to(Project::Table, Project::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-issue-created-by")
                            .from(Issue::Table, Issue::CreatedById)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(IssueTag::Table)
                    .col(ColumnDef::new(IssueTag::IssueId).integer().not_null())
                    .col(ColumnDef::new(IssueTag::TagId).integer().not_null())
                    .col(
                        ColumnDef::new(IssueTag::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(IssueTag::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .primary_key(Index::create().col(IssueTag::IssueId).col(IssueTag::TagId))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-issue-tag-issue")
                            .from(IssueTag::Table, IssueTag::IssueId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-issue-tag-tag")
                            .from(IssueTag::Table, IssueTag::TagId)
                            .to(Tag::Table, Tag::Id),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(IssueAssignee::Table)
                    .col(ColumnDef::new(IssueAssignee::IssueId).integer().not_null())
                    .col(ColumnDef::new(IssueAssignee::UserId).integer().not_null())
                    .col(
                        ColumnDef::new(IssueAssignee::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(IssueAssignee::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .primary_key(
                        Index::create()
                            .col(IssueAssignee::IssueId)
                            .col(IssueAssignee::UserId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-issue-assignee-issue")
                            .from(IssueAssignee::Table, IssueAssignee::IssueId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-issue-assignee-user")
                            .from(IssueAssignee::Table, IssueAssignee::UserId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Comment::Table)
                    .col(
                        ColumnDef::new(Comment::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(Comment::Content).string().not_null())
                    .col(ColumnDef::new(Comment::IssueId).integer().not_null())
                    .col(ColumnDef::new(Comment::UserId).integer().not_null())
                    .col(
                        ColumnDef::new(Comment::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Comment::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-comment-issue")
                            .from(Comment::Table, Comment::IssueId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-comment-user")
                            .from(Comment::Table, Comment::UserId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(Tasks::Table)
                    .col(
                        ColumnDef::new(Tasks::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(Tasks::Title).string().not_null())
                    .col(ColumnDef::new(Tasks::Completed).boolean().not_null())
                    .col(ColumnDef::new(Tasks::Percent).float().not_null())
                    .col(ColumnDef::new(Tasks::IssueId).integer().not_null())
                    .col(
                        ColumnDef::new(Tasks::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Tasks::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-tasks-issue")
                            .from(Tasks::Table, Tasks::IssueId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(Token::Table)
                    .col(
                        ColumnDef::new(Token::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(Token::UserId).integer().not_null())
                    .col(
                        ColumnDef::new(Token::Token)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Token::ExpiresAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Token::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Token::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-token-user")
                            .from(Token::Table, Token::UserId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(ProjectUser::Table)
                    .col(ColumnDef::new(ProjectUser::ProjectId).integer().not_null())
                    .col(ColumnDef::new(ProjectUser::UserId).integer().not_null())
                    .col(
                        ColumnDef::new(ProjectUser::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(ProjectUser::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .primary_key(
                        Index::create()
                            .col(ProjectUser::ProjectId)
                            .col(ProjectUser::UserId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-project-user-project")
                            .from(ProjectUser::Table, ProjectUser::ProjectId)
                            .to(Project::Table, Project::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-project-user-user")
                            .from(ProjectUser::Table, ProjectUser::UserId)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(History::Table)
                    .col(
                        ColumnDef::new(History::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(History::UserId).integer().not_null())
                    .col(ColumnDef::new(History::IssueId).integer())
                    .col(ColumnDef::new(History::CommentId).integer())
                    .col(ColumnDef::new(History::TaskId).integer())
                    .col(ColumnDef::new(History::Action).string().not_null())
                    .col(
                        ColumnDef::new(History::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(History::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-history-user")
                            .from(History::Table, History::UserId)
                            .to(User::Table, User::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-history-issue")
                            .from(History::Table, History::IssueId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-history-comment")
                            .from(History::Table, History::CommentId)
                            .to(Comment::Table, Comment::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-history-task")
                            .from(History::Table, History::TaskId)
                            .to(Tasks::Table, Tasks::Id),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Notification::Table)
                    .col(
                        ColumnDef::new(Notification::Id)
                            .integer()
                            .primary_key()
                            .auto_increment(),
                    )
                    .col(ColumnDef::new(Notification::UserId).integer().not_null())
                    .col(ColumnDef::new(Notification::IssueId).integer())
                    .col(ColumnDef::new(Notification::CommentId).integer())
                    .col(ColumnDef::new(Notification::Message).string().not_null())
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
                            .name("fk-notification-user")
                            .from(Notification::Table, Notification::UserId)
                            .to(User::Table, User::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-notification-issue")
                            .from(Notification::Table, Notification::IssueId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-notification-comment")
                            .from(Notification::Table, Notification::CommentId)
                            .to(Comment::Table, Comment::Id),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(Blocker::Table)
                    .col(ColumnDef::new(Blocker::BlockerId).integer().not_null())
                    .col(ColumnDef::new(Blocker::BlockedId).integer().not_null())
                    .col(
                        ColumnDef::new(Blocker::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .col(
                        ColumnDef::new(Blocker::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)),
                    )
                    .primary_key(
                        Index::create()
                            .col(Blocker::BlockerId)
                            .col(Blocker::BlockedId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-blocker-issue")
                            .from(Blocker::Table, Blocker::BlockerId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-blocked-issue")
                            .from(Blocker::Table, Blocker::BlockedId)
                            .to(Issue::Table, Issue::Id),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx-enail-unique")
                    .col(User::Email)
                    .unique()
                    .table(User::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx-token-unique")
                    .col(Token::Token)
                    .unique()
                    .table(Token::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx-issue-project-id")
                    .col(Issue::ProjectId)
                    .table(Issue::Table)
                    .to_owned(),
            )
            .await?;
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

        manager
            .create_index(
                Index::create()
                    .name("idx-issue-project-icebox")
                    .col(Issue::ProjectId)
                    .col(Issue::IsIcebox)
                    .col(Issue::Status)
                    .table(Issue::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx-issue-project")
                    .col(Issue::ProjectId)
                    .table(Issue::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx-tag-project")
                    .col(Tag::ProjectId)
                    .table(Tag::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-project-user-project")
                    .col(ProjectUser::ProjectId)
                    .table(ProjectUser::Table)
                    .to_owned(),
            )
            .await?;
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
        match manager.get_database_backend() {
            DatabaseBackend::Postgres => {
                manager
                    .exec_stmt(
                        sea_query::Table::create()
                            .table(Alias::new("dummy"))
                            .if_not_exists()
                            .col(
                                ColumnDef::new(Alias::new("id"))
                                    .integer()
                                    .not_null()
                                    .primary_key(),
                            )
                            .to_owned(),
                    )
                    .await?;

                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        r#"CREATE OR REPLACE FUNCTION update_updated_at_column()
                                    RETURNS TRIGGER AS $$
                                    BEGIN
                                        NEW.updated_at = CURRENT_TIMESTAMP;
                                        RETURN NEW;
                                    END;
                                    $$ language 'plpgsql';"#
                            .to_owned(),
                    ))
                    .await?;
            }
            DatabaseBackend::MySql => {
                manager
                    .get_connection()
                    .execute(sea_orm::Statement::from_string(
                        manager.get_database_backend(),
                        "SET SQL_MODE='ALLOW_INVALID_DATES';".to_owned(),
                    ))
                    .await?;
            }
            DatabaseBackend::Sqlite => {}
        }

        let tables = vec![
            "user",
            "owner",
            "project",
            "tag",
            "issue",
            "issue_tag",
            "issue_assignee",
            "comment",
            "tasks",
            "token",
            "project_user",
            "history",
            "notification",
            "blocker",
            "user_setting",
        ];
        for table in tables {
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
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ProjectUser::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Comment::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Tasks::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(IssueAssignee::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(IssueTag::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Issue::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Tag::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Project::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Owner::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Token::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(History::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Notification::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Blocker::Table).to_owned())
            .await?;

        Ok(())
    }
}
#[derive(DeriveIden)]
enum Owner {
    Table,
    Id,
    UserId,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
    Name,
    Email,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Project {
    Table,
    Id,
    Name,
    OwnerId,
    CreatedAt,
    UpdatedAt,
}
#[derive(DeriveIden)]
enum Tag {
    Table,
    Id,
    Name,
    IsEpic,
    ProjectId,
    CreatedAt,
    UpdatedAt,
}
#[derive(DeriveIden)]
enum Issue {
    Table,
    Id,
    Title,
    Description,
    WorkType,
    Points,
    Priority,
    Status,
    IsIcebox,
    ProjectId,
    CreatedById,
    TargetReleaseAt,
    CreatedAt,
    UpdatedAt,
    LockVersion,
}

#[derive(DeriveIden)]
enum IssueTag {
    Table,
    IssueId,
    TagId,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum IssueAssignee {
    Table,
    IssueId,
    UserId,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Comment {
    Table,
    Id,
    Content,
    IssueId,
    UserId,
    CreatedAt,
    UpdatedAt,
}
#[derive(DeriveIden)]
enum Tasks {
    Table,
    Id,
    Title,
    Percent,
    Completed,
    IssueId,
    CreatedAt,
    UpdatedAt,
}
#[derive(DeriveIden)]
enum Token {
    Table,
    Id,
    UserId,
    Token,
    ExpiresAt,
    CreatedAt,
    UpdatedAt,
}
#[derive(DeriveIden)]
enum ProjectUser {
    Table,
    ProjectId,
    UserId,
    CreatedAt,
    UpdatedAt,
}
#[derive(DeriveIden)]
enum History {
    Table,
    Id,
    UserId,
    IssueId,
    CommentId,
    TaskId,
    Action,
    CreatedAt,
    UpdatedAt,
}
#[derive(DeriveIden)]
enum Notification {
    Table,
    Id,
    UserId,
    IssueId,
    CommentId,
    Message,
    Read,
    CreatedAt,
    UpdatedAt,
}
#[derive(DeriveIden)]
enum Blocker {
    Table,
    BlockerId,
    BlockedId,
    CreatedAt,
    UpdatedAt,
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
