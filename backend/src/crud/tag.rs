use crate::entities::tag;
use sea_orm::*;

#[derive(Clone, Debug)]
pub struct TagCrud {
    db: DatabaseConnection,
}

impl TagCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        name: String,
        color: u32,
        is_epic: bool,
    ) -> Result<tag::Model, DbErr> {
        let tag = tag::ActiveModel {
            name: Set(name),
            color: Set(color),
            is_epic: Set(is_epic),
            ..Default::default()
        };

        tag.insert(&self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<tag::Model>, DbErr> {
        tag::Entity::find_by_id(id).one(&self.db).await
    }

    pub async fn find_all(&self) -> Result<Vec<tag::Model>, DbErr> {
        tag::Entity::find().all(&self.db).await
    }

    pub async fn update(
        &self,
        id: i32,
        name: Option<String>,
        color: Option<u32>,
        is_epic: Option<bool>,
    ) -> Result<tag::Model, DbErr> {
        let tag = tag::Entity::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(DbErr::Custom("Tag not found".to_owned()))?;

        let mut tag: tag::ActiveModel = tag.into();

        if let Some(name) = name {
            tag.name = Set(name);
        }

        if let Some(color) = color {
            tag.color = Set(color);
        }

        if let Some(is_epic) = is_epic {
            tag.is_epic = Set(is_epic);
        }

        tag.update(&self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        tag::Entity::delete_by_id(id).exec(&self.db).await
    }
}
