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

    pub async fn create(
        &self,
        token: String,
        app_id: i32,
    ) -> Result<notification_settings::Model, DbErr> {
        let now = Utc::now();
        let project_id = &self.app_state.project.clone().unwrap().id;

        let notification_settings = notification_settings::ActiveModel {
            project_id: Set(*project_id),
            token: Set(token),
            application_id: Set(app_id),
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

        // Fetch all notification settings for this project
        let settings = notification_settings::Entity::find()
            .filter(notification_settings::Column::ProjectId.eq(project_id))
            .all(&self.app_state.db)
            .await?;

        // Delete applications from Gotify before deleting records
        let gotify_client = crate::notifications::gotify::GotifyClient::new();
        for setting in settings {
            if let Err(e) = gotify_client
                .delete_application(setting.application_id as i64)
                .await
            {
                return Err(DbErr::Custom(format!(
                    "Failed to delete Gotify application: {}",
                    e
                )));
            }
        }

        // Delete the notification settings records
        notification_settings::Entity::delete_many()
            .filter(notification_settings::Column::ProjectId.eq(project_id))
            .exec(&self.app_state.db)
            .await
    }
}
