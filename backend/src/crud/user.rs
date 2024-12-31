// use crate::crud::event_broadcaster::EventBroadcaster;
use crate::entities::user;
use sea_orm::*;

#[derive(Clone)]
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

    pub async fn find_by_email(&self, email: String) -> Result<Option<user::Model>, DbErr> {
        user::Entity::find()
            .filter(user::Column::Email.eq(email))
            .one(&self.db)
            .await
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

        let updated_user = user.update(&self.db).await?;
        // this is just an example, remove after I add it to any other crud
        // let broadcaster = EventBroadcaster::new(self.state.tx.clone());
        // broadcaster.broadcast_event(1, "user_updated", serde_json::json!({ "user_id": id }));
        Ok(updated_user)
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        user::Entity::delete_by_id(id).exec(&self.db).await
    }
}
