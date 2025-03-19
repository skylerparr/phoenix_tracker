use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // History Table Indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_history_user_id")
                    .table(History::Table)
                    .col(History::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_history_comment_id")
                    .table(History::Table)
                    .col(History::CommentId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_history_task_id")
                    .table(History::Table)
                    .col(History::TaskId)
                    .to_owned(),
            )
            .await?;

        // Comment Table Indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_comment_user_id")
                    .table(Comment::Table)
                    .col(Comment::UserId)
                    .to_owned(),
            )
            .await?;

        // Issue Table Indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_issue_created_by_id")
                    .table(Issue::Table)
                    .col(Issue::CreatedById)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_issue_status")
                    .table(Issue::Table)
                    .col(Issue::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_issue_work_type")
                    .table(Issue::Table)
                    .col(Issue::WorkType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_issue_points")
                    .table(Issue::Table)
                    .col(Issue::Points)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_issue_updated_at")
                    .table(Issue::Table)
                    .col(Issue::UpdatedAt)
                    .to_owned(),
            )
            .await?;

        // Issue Assignee Table Indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_issue_assignee_user_id")
                    .table(IssueAssignee::Table)
                    .col(IssueAssignee::UserId)
                    .to_owned(),
            )
            .await?;

        // Project User Table Indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_project_user_user_id")
                    .table(ProjectUser::Table)
                    .col(ProjectUser::UserId)
                    .to_owned(),
            )
            .await?;

        // Token Table Indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_token_user_id")
                    .table(Token::Table)
                    .col(Token::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_token_expires_at")
                    .table(Token::Table)
                    .col(Token::ExpiresAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // History Table Indexes
        manager
            .drop_index(
                Index::drop()
                    .name("idx_history_user_id")
                    .table(History::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx_history_comment_id")
                    .table(History::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx_history_task_id")
                    .table(History::Table)
                    .to_owned(),
            )
            .await?;

        // Comment Table Indexes
        manager
            .drop_index(
                Index::drop()
                    .name("idx_comment_user_id")
                    .table(Comment::Table)
                    .to_owned(),
            )
            .await?;

        // Issue Table Indexes
        manager
            .drop_index(
                Index::drop()
                    .name("idx_issue_created_by_id")
                    .table(Issue::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx_issue_status")
                    .table(Issue::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx_issue_work_type")
                    .table(Issue::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx_issue_points")
                    .table(Issue::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx_issue_updated_at")
                    .table(Issue::Table)
                    .to_owned(),
            )
            .await?;

        // Issue Assignee Table Indexes
        manager
            .drop_index(
                Index::drop()
                    .name("idx_issue_assignee_user_id")
                    .table(IssueAssignee::Table)
                    .to_owned(),
            )
            .await?;

        // Project User Table Indexes
        manager
            .drop_index(
                Index::drop()
                    .name("idx_project_user_user_id")
                    .table(ProjectUser::Table)
                    .to_owned(),
            )
            .await?;

        // Token Table Indexes
        manager
            .drop_index(
                Index::drop()
                    .name("idx_token_user_id")
                    .table(Token::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx_token_expires_at")
                    .table(Token::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum History {
    Table,
    UserId,
    CommentId,
    TaskId,
}

#[derive(DeriveIden)]
enum Comment {
    Table,
    UserId,
}

#[derive(DeriveIden)]
enum Issue {
    Table,
    CreatedById,
    Status,
    WorkType,
    Points,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum IssueAssignee {
    Table,
    UserId,
}

#[derive(DeriveIden)]
enum ProjectUser {
    Table,
    UserId,
}

#[derive(DeriveIden)]
enum Token {
    Table,
    UserId,
    ExpiresAt,
}
