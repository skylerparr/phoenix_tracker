use crate::crud::issue::IssueCrud;
use crate::crud::owner::OwnerCrud;
use crate::crud::user_setting::UserSettingCrud;
use crate::entities::issue;
use crate::entities::project;
use crate::entities::project_user;
use crate::AppState;
use sea_orm::*;
use std::sync::Arc;
use tokio::sync::broadcast::Sender;
use tracing::debug;

use super::user;
#[derive(Clone)]
pub struct ProjectCrud {
    state: AppState,
}

impl ProjectCrud {
    pub fn new(state: AppState) -> Self {
        Self { state }
    }

    pub async fn create(&self, name: String, owner_id: i32) -> Result<project::Model, DbErr> {
        let project = project::ActiveModel {
            name: Set(name),
            owner_id: Set(owner_id),
            ..Default::default()
        };

        project.insert(&self.state.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<project::Model>, DbErr> {
        project::Entity::find_by_id(id).one(&self.state.db).await
    }

    pub async fn find_all(&self) -> Result<Vec<project::Model>, DbErr> {
        project::Entity::find().all(&self.state.db).await
    }

    pub async fn find_all_projects_by_user_id(
        &self,
        user_id: i32,
    ) -> Result<Vec<project::Model>, DbErr> {
        debug!("Finding projects for user with ID: {}", user_id);
        let query = project::Entity::find().filter(
            project::Column::Id.in_subquery(
                project_user::Entity::find()
                    .filter(project_user::Column::UserId.eq(user_id))
                    .select_only()
                    .column(project_user::Column::ProjectId)
                    .distinct()
                    .into_query(),
            ),
        );
        debug!(
            "Generated query: {:?}",
            query.build(self.state.db.get_database_backend())
        );
        match query.all(&self.state.db).await {
            Ok(data) => {
                debug!(
                    "Query result IDs: {:?}",
                    data.iter().map(|project| project.id).collect::<Vec<_>>()
                );
                Ok(data)
            }
            Err(e) => {
                debug!("Query error: {:?}", e);
                Err(e)
            }
        }
    }

    pub async fn update(
        &self,
        id: i32,
        name: Option<String>,
        owner_id: Option<i32>,
    ) -> Result<project::Model, DbErr> {
        let project = project::Entity::find_by_id(id)
            .one(&self.state.db)
            .await?
            .ok_or(DbErr::Custom("Project not found".to_owned()))?;

        let mut project: project::ActiveModel = project.into();

        if let Some(name) = name {
            project.name = Set(name);
        }

        if let Some(owner_id) = owner_id {
            project.owner_id = Set(owner_id);
        }

        project.update(&self.state.db).await
    }

    pub async fn find_users_by_project_id(
        &self,
        project_id: i32,
    ) -> Result<Vec<project_user::Model>, DbErr> {
        debug!("Finding users for project with ID: {}", project_id);
        let query =
            project_user::Entity::find().filter(project_user::Column::ProjectId.eq(project_id));
        debug!(
            "Generated query: {:?}",
            query.build(self.state.db.get_database_backend())
        );
        match query.all(&self.state.db).await {
            Ok(data) => Ok(data),
            Err(e) => {
                debug!("Query error: {:?}", e);
                Err(e)
            }
        }
    }

    pub async fn delete_cascade(&self, id: i32) -> Result<DeleteResult, DbErr> {
        let project = self.find_by_id(id).await?;
        if project.is_none() {
            return Err(DbErr::Custom("Project not found".to_owned()));
        }

        debug!("Finding issues for project with ID: {}", id);
        let issues = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(id))
            .all(&self.state.db)
            .await?;
        debug!("Issues found: {:?}", issues);

        let issue_crud = IssueCrud::new(self.state.clone());
        debug!("Created IssueCrud instance");

        for issue in issues {
            debug!("Deleting issue with ID: {}", issue.id);
            issue_crud.delete(issue.id).await?;
        }

        debug!("Deleting project users for project ID: {}", id);
        project_user::Entity::delete_many()
            .filter(project_user::Column::ProjectId.eq(id))
            .exec(&self.state.db)
            .await?;
        debug!("Deleted project users");
        let user_id = self.state.user.clone().unwrap().id;
        debug!("User ID retrieved: {}", user_id);
        let user_setting_crud = UserSettingCrud::new(self.state.db.clone());
        user_setting_crud.update(user_id, None).await?;
        debug!("Updated user settings for user ID: {}", user_id);

        debug!("Deleting project with ID: {}", id);
        project::Entity::delete_by_id(id)
            .exec(&self.state.db)
            .await?;

        let owner_id = project.unwrap().owner_id.clone();
        let owner_crud = OwnerCrud::new(self.state.db.clone());
        debug!("Created OwnerCrud instance");
        owner_crud.delete(owner_id).await
    }
}
