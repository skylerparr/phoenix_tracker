use sea_orm::*;

#[derive(Clone, Debug)]
pub struct OwnerCrud {
    db: DatabaseConnection,
}

impl OwnerCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(&self, user_id: i32) -> Result<owner::Model, DbErr> {
        let owner = owner::ActiveModel {
            user_id: Set(user_id),
            ..Default::default()
        };
        
        owner.insert(&self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<owner::Model>, DbErr> {
        owner::Entity::find_by_id(id)
            .one(&self.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<owner::Model>, DbErr> {
        owner::Entity::find()
            .all(&self.db)
            .await
    }

    pub async fn update(&self, id: i32, user_id: Option<i32>) -> Result<owner::Model, DbErr> {
        let owner = owner::Entity::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(DbErr::Custom("Owner not found".to_owned()))?;

        let mut owner: owner::ActiveModel = owner.into();

        if let Some(user_id) = user_id {
            owner.user_id = Set(user_id);
        }

        owner.update(&self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        owner::Entity::delete_by_id(id)
            .exec(&self.db)
            .await
    }
}
