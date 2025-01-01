use crate::entities::user_setting;
use sea_orm::*;

#[derive(Clone, Debug)]
pub struct UserSettingCrud {
    db: DatabaseConnection,
}

impl UserSettingCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        user_id: i32,
        project_id: Option<i32>,
    ) -> Result<user_setting::Model, DbErr> {
        let user_setting = user_setting::ActiveModel {
            user_id: Set(user_id),
            project_id: Set(project_id),
            ..Default::default()
        };

        user_setting.insert(&self.db).await
    }

    pub async fn find_by_user_id(&self, user_id: i32) -> Result<user_setting::Model, DbErr> {
        user_setting::Entity::find()
            .filter(user_setting::Column::UserId.eq(user_id))
            .one(&self.db)
            .await?
            .ok_or(DbErr::Custom("User setting not found".to_owned()))
    }

    pub async fn delete(
        &self,
        user_id: i32,
        project_id: Option<i32>,
    ) -> Result<DeleteResult, DbErr> {
        user_setting::Entity::delete_many()
            .filter(user_setting::Column::UserId.eq(user_id))
            .filter(user_setting::Column::ProjectId.eq(project_id))
            .exec(&self.db)
            .await
    }

    pub async fn update(
        &self,
        user_id: i32,
        project_id: Option<i32>,
    ) -> Result<user_setting::Model, DbErr> {
        let txn = self.db.begin().await?;

        let user_setting = self.find_by_user_id(user_id).await?;
        let current_version = user_setting.lock_version;
        let mut updated_user_setting: user_setting::ActiveModel = user_setting.clone().into();

        updated_user_setting.project_id = Set(project_id);
        updated_user_setting.lock_version = Set(current_version + 1);

        let result = updated_user_setting.update(&txn).await?;
        if result.lock_version != current_version + 1 {
            txn.rollback().await?;
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }
        txn.commit().await?;
        Ok(result)
    }
}
