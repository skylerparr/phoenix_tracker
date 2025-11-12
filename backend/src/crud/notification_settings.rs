use crate::entities::notification_settings;
use crate::AppState;
use chrono::Utc;
use sea_orm::*;

#[derive(Clone)]
pub struct NotificationSettingsCrud {
    app_state: AppState,
}

impl NotificationSettingsCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(&self, token: String) -> Result<notification_settings::Model, DbErr> {
        let now = Utc::now();
        let project_id = &self.app_state.project.clone().unwrap().id;

        let notification_settings = notification_settings::ActiveModel {
            project_id: Set(*project_id),
            token: Set(token),
            lock_version: Set(1),
            created_at: Set(now.into()),
            updated_at: Set(now.into()),
            ..Default::default()
        };

        notification_settings.insert(&self.app_state.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<notification_settings::Model>, DbErr> {
        let project_id = &self.app_state.project.clone().unwrap().id;
        notification_settings::Entity::find()
            .filter(notification_settings::Column::ProjectId.eq(*project_id))
            .filter(notification_settings::Column::Id.eq(id))
            .one(&self.app_state.db)
            .await
    }

    pub async fn find_by_project_id(
        &self,
        project_id: i32,
    ) -> Result<Option<notification_settings::Model>, DbErr> {
        notification_settings::Entity::find()
            .filter(notification_settings::Column::ProjectId.eq(project_id))
            .one(&self.app_state.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<notification_settings::Model>, DbErr> {
        let project_id = &self.app_state.project.clone().unwrap().id;
        notification_settings::Entity::find()
            .filter(notification_settings::Column::ProjectId.eq(*project_id))
            .order_by_asc(notification_settings::Column::CreatedAt)
            .all(&self.app_state.db)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        token: Option<String>,
    ) -> Result<notification_settings::Model, DbErr> {
        let project_id = &self.app_state.project.clone().unwrap().id;
        let notification_settings_model = notification_settings::Entity::find_by_id(id)
            .filter(notification_settings::Column::ProjectId.eq(*project_id))
            .one(&self.app_state.db)
            .await?
            .ok_or(DbErr::Custom("Notification settings not found".to_owned()))?;

        let current_version = notification_settings_model.lock_version;
        let mut notification_settings: notification_settings::ActiveModel =
            notification_settings_model.into();

        if let Some(token) = token {
            notification_settings.token = Set(token);
        }

        notification_settings.lock_version = Set(current_version + 1);
        notification_settings.updated_at = Set(Utc::now().into());

        let result = notification_settings.update(&self.app_state.db).await?;
        if result.lock_version != current_version + 1 {
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }

        Ok(result)
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        let project_id = &self.app_state.project.clone().unwrap().id;
        let _notification_settings = notification_settings::Entity::find_by_id(id)
            .filter(notification_settings::Column::ProjectId.eq(*project_id))
            .one(&self.app_state.db)
            .await?
            .ok_or(DbErr::Custom("Notification settings not found".to_owned()))?;

        notification_settings::Entity::delete_by_id(id)
            .exec(&self.app_state.db)
            .await
    }

    pub async fn delete_by_project_id(&self, project_id: i32) -> Result<DeleteResult, DbErr> {
        let current_project_id = self.app_state.project.clone().unwrap().id;
        if current_project_id != project_id {
            return Err(DbErr::Custom(
                "Project id mismatch with current context".to_owned(),
            ));
        }

        notification_settings::Entity::delete_many()
            .filter(notification_settings::Column::ProjectId.eq(project_id))
            .exec(&self.app_state.db)
            .await
    }
}
