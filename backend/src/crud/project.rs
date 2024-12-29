use crate::entities::project;
use sea_orm::*;

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
}
