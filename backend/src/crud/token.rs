use crate::entities::token;
use rand::Rng;
use sea_orm::prelude::DateTimeWithTimeZone;
use sea_orm::*;

#[derive(Clone, Debug)]
pub struct TokenCrud {
    db: DatabaseConnection,
}

impl TokenCrud {
    #[allow(dead_code)]
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    #[allow(dead_code)]
    pub fn generate_bearer_token() -> String {
        const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const TOKEN_LENGTH: usize = 32;
        let mut rng = rand::thread_rng();

        let token: String = (0..TOKEN_LENGTH)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect();

        format!("Bearer {}", token)
    }

    #[allow(dead_code)]
    pub async fn create(
        &self,
        user_id: i32,
        expires_at: DateTimeWithTimeZone,
    ) -> Result<token::Model, DbErr> {
        let token = token::ActiveModel {
            user_id: Set(user_id),
            token: Set(Self::generate_bearer_token()),
            expires_at: Set(expires_at),
            ..Default::default()
        };

        token.insert(&self.db).await
    }

    #[allow(dead_code)]
    pub async fn find_by_id(&self, id: i32) -> Result<Option<token::Model>, DbErr> {
        token::Entity::find_by_id(id).one(&self.db).await
    }

    #[allow(dead_code)]
    pub async fn find_all(&self) -> Result<Vec<token::Model>, DbErr> {
        token::Entity::find().all(&self.db).await
    }

    #[allow(dead_code)]
    pub async fn find_by_user_id(&self, user_id: i32) -> Result<Vec<token::Model>, DbErr> {
        token::Entity::find()
            .filter(token::Column::UserId.eq(user_id))
            .all(&self.db)
            .await
    }

    #[allow(dead_code)]
    pub async fn update(
        &self,
        id: i32,
        expires_at: Option<DateTimeWithTimeZone>,
    ) -> Result<token::Model, DbErr> {
        let token = token::Entity::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(DbErr::Custom("Token not found".to_owned()))?;

        let mut token: token::ActiveModel = token.into();

        if let Some(expires_at) = expires_at {
            token.expires_at = Set(expires_at);
        }

        token.update(&self.db).await
    }

    #[allow(dead_code)]
    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        token::Entity::delete_by_id(id).exec(&self.db).await
    }

    #[allow(dead_code)]
    pub async fn delete_by_user_id(&self, user_id: i32) -> Result<DeleteResult, DbErr> {
        token::Entity::delete_many()
            .filter(token::Column::UserId.eq(user_id))
            .exec(&self.db)
            .await
    }
}

impl TokenCrud {
    pub async fn find_valid_token(
        &self,
        token_str: String,
        current_time: DateTimeWithTimeZone,
    ) -> Result<Option<token::Model>, DbErr> {
        let token = token::Entity::find()
            .filter(token::Column::Token.eq(token_str))
            .filter(token::Column::ExpiresAt.gt(current_time))
            .one(&self.db)
            .await?;

        Ok(token)
    }
}
