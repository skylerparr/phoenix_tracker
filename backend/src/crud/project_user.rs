use crate::crud::owner::OwnerCrud;
use crate::entities::project;
use crate::entities::project_user;
use crate::AppState;
use sea_orm::*;

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

    pub async fn delete(&self, project_id: i32, user_id: i32) -> Result<DeleteResult, DbErr> {
        if self.is_project_owner(user_id, project_id).await? {
            return Ok(DeleteResult { rows_affected: 0 });
        }

        project_user::Entity::delete_many()
            .filter(project_user::Column::ProjectId.eq(project_id))
            .filter(project_user::Column::UserId.eq(user_id))
            .exec(&self.state.db)
            .await
    }

    pub async fn is_project_owner(&self, user_id: i32, project_id: i32) -> Result<bool, DbErr> {
        let project = project::Entity::find_by_id(project_id)
            .one(&self.state.db)
            .await?
            .ok_or(DbErr::Custom("Project not found".to_owned()))?;
        let owner_crud = OwnerCrud::new(self.state.db.clone());
        let owner = owner_crud.find_by_id(project.owner_id).await?;
        if let Some(owner) = owner {
            Ok(owner.user_id == Some(user_id))
        } else {
            Ok(false)
        }
    }
}
