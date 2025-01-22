use crate::crud::project_user::ProjectUserCrud;
use crate::entities::user;
use crate::AppState;
use sea_orm::*;

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

    pub async fn find_all(
        &self,
        project_id: i32,
        user_ids: Vec<i32>,
    ) -> Result<Vec<user::Model>, DbErr> {
        let mut users = user::Entity::find()
            .filter(user::Column::Id.is_in(user_ids))
            .all(&self.state.db)
            .await?;

        let project_user_crud = ProjectUserCrud::new(self.state.clone());

        for user in &mut users {
            user.is_project_owner = project_user_crud
                .is_project_owner(user.id, project_id)
                .await?;
        }

        Ok(users)
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
        Ok(updated_user)
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        user::Entity::delete_by_id(id).exec(&self.state.db).await
    }
}
