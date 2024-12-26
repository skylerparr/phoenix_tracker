use crate::entities::user;
use sea_orm::*;

#[derive(Clone, Debug)]
pub struct UserCrud {
    db: DatabaseConnection,
}

impl UserCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(&self, name: String, email: String) -> Result<user::Model, DbErr> {
        let user = user::ActiveModel {
            name: Set(name),
            email: Set(email),
            ..Default::default()
        };

        user.insert(&self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<user::Model>, DbErr> {
        user::Entity::find_by_id(id).one(&self.db).await
    }

    pub async fn find_all(&self) -> Result<Vec<user::Model>, DbErr> {
        user::Entity::find().all(&self.db).await
    }

    pub async fn update(
        &self,
        id: i32,
        name: Option<String>,
        email: Option<String>,
    ) -> Result<user::Model, DbErr> {
        let user = user::Entity::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(DbErr::Custom("User not found".to_owned()))?;

        let mut user: user::ActiveModel = user.into();

        if let Some(name) = name {
            user.name = Set(name);
        }

        if let Some(email) = email {
            user.email = Set(email);
        }

        user.update(&self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        user::Entity::delete_by_id(id).exec(&self.db).await
    }
}
