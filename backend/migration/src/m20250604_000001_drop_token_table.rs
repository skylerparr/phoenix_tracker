use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the token table since we're now using JWT tokens
        manager
            .drop_table(Table::drop().table(Token::Table).to_owned())
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Recreate the token table if we need to rollback
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

        // Recreate the unique index
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

        Ok(())
    }
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
enum User {
    Table,
    Id,
}
