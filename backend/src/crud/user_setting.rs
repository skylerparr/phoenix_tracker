use crate::entities::user_setting;
use sea_orm::*;
use tracing::debug;

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
            lock_version: Set(0),
            ..Default::default()
        };

        user_setting.insert(&self.db).await
    }

    pub async fn find_by_user_id(&self, user_id: i32) -> Result<user_setting::Model, DbErr> {
        match user_setting::Entity::find()
            .filter(user_setting::Column::UserId.eq(user_id))
            .one(&self.db)
            .await?
        {
            Some(setting) => Ok(setting),
            None => self.create(user_id, None).await,
        }
    }

    pub async fn update(
        &self,
        user_id: i32,
        project_id: Option<i32>,
    ) -> Result<user_setting::Model, DbErr> {
        let user_setting = self.find_by_user_id(user_id).await?;

        let txn = self.db.begin().await?;
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

    pub async fn upsert(
        &self,
        user_id: i32,
        project_id: Option<i32>,
    ) -> Result<user_setting::Model, DbErr> {
        match self.find_by_user_id(user_id).await {
            Ok(existing_setting) => {
                debug!(
                    "Found existing setting for user {}: {:?}",
                    user_id, existing_setting
                );
                self.update(user_id, project_id).await
            }
            Err(err) => {
                debug!(
                    "No existing setting found for user {}, creating new: {:?}",
                    user_id, err
                );
                self.create(user_id, project_id).await
            }
        }
    }
}
