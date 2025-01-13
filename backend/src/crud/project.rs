use crate::entities::project;
use crate::entities::project_user;
use sea_orm::*;
use tracing::debug;

pub struct ProjectCrud {
    db: DatabaseConnection,
}

impl ProjectCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(&self, name: String, owner_id: i32) -> Result<project::Model, DbErr> {
        let project = project::ActiveModel {
            name: Set(name),
            owner_id: Set(owner_id),
            ..Default::default()
        };

        project.insert(&self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<project::Model>, DbErr> {
        project::Entity::find_by_id(id).one(&self.db).await
    }

    pub async fn find_all(&self) -> Result<Vec<project::Model>, DbErr> {
        project::Entity::find().all(&self.db).await
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
            query.build(self.db.get_database_backend())
        );
        match query.all(&self.db).await {
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
            .one(&self.db)
            .await?
            .ok_or(DbErr::Custom("Project not found".to_owned()))?;

        let mut project: project::ActiveModel = project.into();

        if let Some(name) = name {
            project.name = Set(name);
        }

        if let Some(owner_id) = owner_id {
            project.owner_id = Set(owner_id);
        }

        project.update(&self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        project::Entity::delete_by_id(id).exec(&self.db).await
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
            query.build(self.db.get_database_backend())
        );
        match query.all(&self.db).await {
            Ok(data) => Ok(data),
            Err(e) => {
                debug!("Query error: {:?}", e);
                Err(e)
            }
        }
    }
}
