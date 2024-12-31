use crate::entities::project_user;
use crate::AppState;
use sea_orm::*;

#[derive(Clone)]
pub struct ProjectUserCrud {
    state: AppState,
}

impl ProjectUserCrud {
    pub fn new(state: AppState) -> Self {
        Self { state }
    }

    pub async fn create(
        &self,
        project_id: i32,
        user_id: i32,
    ) -> Result<project_user::Model, DbErr> {
        let project_user = project_user::ActiveModel {
            project_id: Set(project_id),
            user_id: Set(user_id),
        };

        project_user.insert(&self.state.db).await
    }

    pub async fn get_users_for_project(
        &self,
        project_id: i32,
    ) -> Result<Vec<project_user::Model>, DbErr> {
        project_user::Entity::find()
            .filter(project_user::Column::ProjectId.eq(project_id))
            .all(&self.state.db)
            .await
    }
}
