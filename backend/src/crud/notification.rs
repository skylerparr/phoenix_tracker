use crate::entities::notification;
use crate::AppState;
use chrono::{DateTime, FixedOffset};
use sea_orm::*;
use tracing::debug;

#[derive(Clone)]
pub struct NotificationCrud {
    state: AppState,
}

impl NotificationCrud {
    pub fn new(state: AppState) -> Self {
        Self { state }
    }

    pub async fn create(
        &self,
        title: String,
        description: String,
        project_id: i32,
        issue_id: i32,
        initiated_by_user_id: i32,
        targeted_user_id: i32,
    ) -> Result<notification::Model, DbErr> {
        debug!(
            "Creating notification for project {} and user {} from user {}",
            project_id, targeted_user_id, initiated_by_user_id
        );

        let notification = notification::ActiveModel {
            title: Set(title),
            description: Set(description),
            project_id: Set(project_id),
            issue_id: Set(issue_id),
            initiated_by_user_id: Set(initiated_by_user_id),
            targeted_user_id: Set(targeted_user_id),
            read: Set(false),
            ..Default::default()
        };

        let created_notification = notification.insert(&self.state.db).await?;

        debug!(
            "Successfully created notification with id {}",
            created_notification.id
        );

        Ok(created_notification)
    }

    pub async fn get_all_for_project(
        &self,
        project_id: i32,
        target_user_id: i32,
        cursor: Option<(DateTime<FixedOffset>, i32)>,
    ) -> Result<Vec<notification::Model>, DbErr> {
        debug!(
            "Finding notifications for project {} and user {}",
            project_id, target_user_id
        );

        let limit = 25;
        let mut query = notification::Entity::find()
            .filter(notification::Column::ProjectId.eq(project_id))
            .filter(notification::Column::TargetedUserId.eq(target_user_id))
            .order_by_desc(notification::Column::CreatedAt)
            .order_by_desc(notification::Column::Id)
            .limit(limit);

        if let Some((cursor_created_at, cursor_id)) = cursor {
            query = query.filter(
                Condition::any()
                    .add(notification::Column::CreatedAt.lt(cursor_created_at))
                    .add(
                        Condition::all()
                            .add(notification::Column::CreatedAt.eq(cursor_created_at))
                            .add(notification::Column::Id.lt(cursor_id)),
                    ),
            );
        }

        let notifications = query.all(&self.state.db).await?;

        debug!(
            "Found {} notifications for project {} and user {}",
            notifications.len(),
            project_id,
            target_user_id
        );

        Ok(notifications)
    }

    pub async fn delete_all_for_project(&self, project_id: i32) -> Result<DeleteResult, DbErr> {
        debug!("Deleting all notifications for project {}", project_id);

        let result = notification::Entity::delete_many()
            .filter(notification::Column::ProjectId.eq(project_id))
            .exec(&self.state.db)
            .await?;

        debug!(
            "Deleted {} notifications for project {}",
            result.rows_affected, project_id
        );

        Ok(result)
    }

    pub async fn mark_as_read(&self, notification_id: i32) -> Result<notification::Model, DbErr> {
        debug!("Marking notification {} as read", notification_id);

        let notification = notification::Entity::find_by_id(notification_id)
            .one(&self.state.db)
            .await?
            .ok_or(DbErr::Custom("Notification not found".to_owned()))?;

        let mut notification: notification::ActiveModel = notification.into();
        notification.read = Set(true);

        let updated_notification = notification.update(&self.state.db).await?;

        debug!(
            "Successfully marked notification {} as read",
            notification_id
        );

        Ok(updated_notification)
    }

    pub async fn get_unread_count_for_user_and_project(
        &self,
        project_id: i32,
        target_user_id: i32,
    ) -> Result<i32, DbErr> {
        debug!(
            "Getting notification count for project {} and user {}",
            project_id, target_user_id
        );
        let count = notification::Entity::find()
            .filter(notification::Column::ProjectId.eq(project_id))
            .filter(notification::Column::TargetedUserId.eq(target_user_id))
            .filter(notification::Column::Read.eq(false))
            .count(&self.state.db)
            .await?;

        debug!(
            "Found {} notifications for project {} and user {}",
            count, project_id, target_user_id
        );

        Ok(count as i32)
    }
}
