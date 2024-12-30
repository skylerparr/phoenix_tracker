use crate::entities::user;
use crate::AppState;
use sea_orm::*;
use tracing::debug;

#[derive(Clone)]
pub struct UserCrud {
    state: AppState,
}

impl UserCrud {
    pub fn new(state: AppState) -> Self {
        Self { state }
    }

    pub async fn create(&self, name: String, email: String) -> Result<user::Model, DbErr> {
        let user = user::ActiveModel {
            name: Set(name),
            email: Set(email),
            ..Default::default()
        };

        user.insert(&self.state.db).await
    }
    pub async fn find_by_id(&self, id: i32) -> Result<Option<user::Model>, DbErr> {
        user::Entity::find_by_id(id).one(&self.state.db).await
    }

    pub async fn find_all(&self) -> Result<Vec<user::Model>, DbErr> {
        user::Entity::find().all(&self.state.db).await
    }

    pub async fn find_by_email(&self, email: String) -> Result<Option<user::Model>, DbErr> {
        user::Entity::find()
            .filter(user::Column::Email.eq(email))
            .one(&self.state.db)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        name: Option<String>,
        email: Option<String>,
    ) -> Result<user::Model, DbErr> {
        let user = user::Entity::find_by_id(id)
            .one(&self.state.db)
            .await?
            .ok_or(DbErr::Custom("User not found".to_owned()))?;

        let mut user: user::ActiveModel = user.into();

        if let Some(name) = name {
            user.name = Set(name);
        }

        if let Some(email) = email {
            user.email = Set(email);
        }

        let updated_user = user.update(&self.state.db).await?;

        debug!("Sending user_updated event for user_id: {}", id);
        let event = serde_json::json!({
            "project_id": 1,
            "type": "user_updated",
            "data": {
                "user_id": id,
            }
        });
        debug!(
            "Event payload: {}",
            serde_json::to_string_pretty(&event).unwrap()
        );
        match self.state.tx.send(serde_json::to_string(&event).unwrap()) {
            Ok(_) => debug!("Event broadcast successful"),
            Err(e) => debug!("Failed to broadcast event: {:?}", e),
        }
        debug!("Event sent successfully");
        Ok(updated_user)
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        user::Entity::delete_by_id(id).exec(&self.state.db).await
    }
}
