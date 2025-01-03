use crate::entities::tag;
use crate::AppState;
use sea_orm::*;

#[derive(Clone)]
pub struct TagCrud {
    app_state: AppState,
}

impl TagCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(
        &self,
        project_id: i32,
        name: String,
        is_epic: bool,
    ) -> Result<tag::Model, DbErr> {
        let tag = tag::ActiveModel {
            project_id: Set(project_id),
            name: Set(name),
            is_epic: Set(is_epic),
            ..Default::default()
        };

        tag.insert(&self.app_state.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<tag::Model>, DbErr> {
        tag::Entity::find_by_id(id).one(&self.app_state.db).await
    }

    pub async fn find_all(&self, project_id: i32) -> Result<Vec<tag::Model>, DbErr> {
        tag::Entity::find()
            .filter(tag::Column::ProjectId.eq(project_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        name: Option<String>,
        is_epic: Option<bool>,
    ) -> Result<tag::Model, DbErr> {
        let tag = tag::Entity::find_by_id(id)
            .one(&self.app_state.db)
            .await?
            .ok_or(DbErr::Custom("Tag not found".to_owned()))?;

        let mut tag: tag::ActiveModel = tag.into();

        if let Some(name) = name {
            tag.name = Set(name);
        }

        if let Some(is_epic) = is_epic {
            tag.is_epic = Set(is_epic);
        }

        tag.update(&self.app_state.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tag::Entity::delete_by_id(id).exec(&self.app_state.db).await
    }
}
