use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;
  #[async_trait::async_trait]
  impl MigrationTrait for Migration {
      async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
          manager
              .create_table(
                  Table::create()
                      .table(User::Table)
                      .col(ColumnDef::new(User::Id).integer().primary_key().auto_increment())
                      .col(ColumnDef::new(User::Name).string().not_null())
                      .col(ColumnDef::new(User::Email).string().not_null().unique_key())
                      .col(ColumnDef::new(User::CreatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .col(ColumnDef::new(User::UpdatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .to_owned(),
              )
              .await?;
          manager
              .create_table(
                  Table::create()
                      .table(Owner::Table)
                      .col(ColumnDef::new(Owner::Id).integer().primary_key().auto_increment())
                      .col(ColumnDef::new(Owner::UserId).integer().not_null())
                      .col(ColumnDef::new(Owner::CreatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .col(ColumnDef::new(Owner::UpdatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-owner-user")
                              .from(Owner::Table, Owner::UserId)
                              .to(User::Table, User::Id)
                      )
                      .to_owned(),
              )
              .await?;

          manager
              .create_table(
                  Table::create()
                      .table(Project::Table)
                      .col(ColumnDef::new(Project::Id).integer().primary_key().auto_increment())
                      .col(ColumnDef::new(Project::Name).string().not_null())
                      .col(ColumnDef::new(Project::OwnerId).integer().not_null())
                      .col(ColumnDef::new(Project::CreatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .col(ColumnDef::new(Project::UpdatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-project-owner")
                              .from(Project::Table, Project::OwnerId)
                              .to(Owner::Table, Owner::Id)
                      )
                      .to_owned(),
              )
              .await?;

          manager
              .create_table(
                  Table::create()
                      .table(Tag::Table)
                      .col(ColumnDef::new(Tag::Id).integer().primary_key().auto_increment())
                      .col(ColumnDef::new(Tag::Name).string().not_null())
                      .col(ColumnDef::new(Tag::Color).unsigned().not_null())
                      .col(ColumnDef::new(Tag::IsEpic).boolean().not_null())
                      .col(ColumnDef::new(Tag::CreatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .col(ColumnDef::new(Tag::UpdatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .to_owned(),
              )
              .await?;

          manager
              .create_table(
                  Table::create()
                      .table(Issue::Table)
                      .col(ColumnDef::new(Issue::Id).integer().primary_key().auto_increment())
                      .col(ColumnDef::new(Issue::Title).string().not_null())
                      .col(ColumnDef::new(Issue::Description).string())
                      .col(ColumnDef::new(Issue::Priority).integer().not_null())
                      .col(ColumnDef::new(Issue::Status).string().not_null())
                      .col(ColumnDef::new(Issue::ProjectId).integer().not_null())
                      .col(ColumnDef::new(Issue::CreatedById).integer().not_null())
                      .col(ColumnDef::new(Issue::CreatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .col(ColumnDef::new(Issue::UpdatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-issue-project")
                              .from(Issue::Table, Issue::ProjectId)
                              .to(Project::Table, Project::Id)
                      )
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-issue-created-by")
                              .from(Issue::Table, Issue::CreatedById)
                              .to(User::Table, User::Id)
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
                      .col(ColumnDef::new(IssueTag::CreatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .col(ColumnDef::new(IssueTag::UpdatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .primary_key(Index::create().col(IssueTag::IssueId).col(IssueTag::TagId))
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-issue-tag-issue")
                              .from(IssueTag::Table, IssueTag::IssueId)
                              .to(Issue::Table, Issue::Id)
                      )
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-issue-tag-tag")
                              .from(IssueTag::Table, IssueTag::TagId)
                              .to(Tag::Table, Tag::Id)
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
                      .col(ColumnDef::new(IssueAssignee::CreatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .col(ColumnDef::new(IssueAssignee::UpdatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .primary_key(Index::create().col(IssueAssignee::IssueId).col(IssueAssignee::UserId))
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-issue-assignee-issue")
                              .from(IssueAssignee::Table, IssueAssignee::IssueId)
                              .to(Issue::Table, Issue::Id)
                      )
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-issue-assignee-user")
                              .from(IssueAssignee::Table, IssueAssignee::UserId)
                              .to(User::Table, User::Id)
                      )
                      .to_owned(),
              )
              .await?;

          manager
              .create_table(
                  Table::create()
                      .table(Comment::Table)
                      .col(ColumnDef::new(Comment::Id).integer().primary_key().auto_increment())
                      .col(ColumnDef::new(Comment::Content).string().not_null())
                      .col(ColumnDef::new(Comment::IssueId).integer().not_null())
                      .col(ColumnDef::new(Comment::UserId).integer().not_null())
                      .col(ColumnDef::new(Comment::CreatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .col(ColumnDef::new(Comment::UpdatedAt).timestamp().not_null().default(SimpleExpr::Keyword(Keyword::CurrentTimestamp)))
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-comment-issue")
                              .from(Comment::Table, Comment::IssueId)
                              .to(Issue::Table, Issue::Id)
                      )
                      .foreign_key(
                          ForeignKey::create()
                              .name("fk-comment-user")
                              .from(Comment::Table, Comment::UserId)
                              .to(User::Table, User::Id)
                      )
                      .to_owned(),
              )
              .await?;

          Ok(())
      }

      async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
          manager.drop_table(Table::drop().table(Comment::Table).to_owned()).await?;
          manager.drop_table(Table::drop().table(IssueAssignee::Table).to_owned()).await?;
          manager.drop_table(Table::drop().table(IssueTag::Table).to_owned()).await?;
          manager.drop_table(Table::drop().table(Issue::Table).to_owned()).await?;
          manager.drop_table(Table::drop().table(Tag::Table).to_owned()).await?;
          manager.drop_table(Table::drop().table(Project::Table).to_owned()).await?;
          manager.drop_table(Table::drop().table(Owner::Table).to_owned()).await?;
          manager.drop_table(Table::drop().table(User::Table).to_owned()).await?;
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
    Color,
    IsEpic,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Issue {
    Table,
    Id,
    Title,
    Description,
    Priority,
    Status,
    ProjectId,
    CreatedById,
    CreatedAt,
    UpdatedAt,
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