use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::crud::history::HistoryCrud;

use crate::crud::notification::NotificationCrud;
use crate::{entities::comment, AppState};
use sea_orm::*;
use tracing::debug;

#[derive(Clone)]
pub struct CommentCrud {
    app_state: AppState,
}

impl CommentCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(
        &self,
        content: String,
        issue_id: i32,
        user_id: i32,
    ) -> Result<comment::Model, DbErr> {
        debug!(
            "Creating comment for issue {} by user {}, comment {}",
            issue_id, user_id, content
        );
        let comment = comment::ActiveModel {
            content: Set(content.clone()),
            issue_id: Set(issue_id),
            user_id: Set(user_id),
            ..Default::default()
        };
        let result = comment.insert(&self.app_state.db).await?;
        let comment_id = result.id.clone();
        debug!("comment created with id {}", comment_id);

        // Add history entry
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        history_crud
            .create(
                user_id,
                Some(issue_id),
                Some(comment_id),
                None,
                format!("created comment: {}", content),
            )
            .await?;

        // Create notifications for assigned users (excluding the comment author)
        let notification_crud = NotificationCrud::new(self.app_state.clone());
        let project_id = &self.app_state.project.clone().unwrap().id;
        let description = format!("New comment: '{}'", content.clone());

        let _ = notification_crud
            .notify_issue_assignees_with_context(
                issue_id,
                "New Comment on Issue: {}",
                description,
                user_id,
                *project_id,
            )
            .await;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({"id": user_id}),
        );

        return Ok(result);
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<comment::Model>, DbErr> {
        comment::Entity::find_by_id(id)
            .one(&self.app_state.db)
            .await
    }

    pub async fn find_by_issue_id(&self, issue_id: i32) -> Result<Vec<comment::Model>, DbErr> {
        comment::Entity::find()
            .filter(comment::Column::IssueId.eq(issue_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn find_by_user_id(&self, user_id: i32) -> Result<Vec<comment::Model>, DbErr> {
        comment::Entity::find()
            .filter(comment::Column::UserId.eq(user_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn delete_all_by_issue_id(&self, issue_id: i32) -> Result<DeleteResult, DbErr> {
        comment::Entity::delete_many()
            .filter(comment::Column::IssueId.eq(issue_id))
            .exec(&self.app_state.db)
            .await
    }

    pub async fn update(&self, id: i32, content: String) -> Result<comment::Model, DbErr> {
        let txn = self.app_state.db.begin().await?;
        let comment_model = comment::Entity::find_by_id(id)
            .one(&txn)
            .await?
            .ok_or(DbErr::Custom("Comment not found".to_owned()))?;

        let current_version = comment_model.lock_version;
        let user_id = comment_model.user_id;
        let issue_id = comment_model.issue_id;
        let old_content = comment_model.content.clone();

        let mut comment: comment::ActiveModel = comment_model.into();

        // Update content if it has changed
        if old_content != content {
            comment.content = Set(content.clone());
        }

        comment.lock_version = Set(current_version + 1);
        let result = comment.update(&txn).await?;

        if result.lock_version != current_version + 1 {
            txn.rollback().await?;
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }

        txn.commit().await?;

        // Add history entry if content changed
        if old_content != content {
            let history_crud = HistoryCrud::new(self.app_state.db.clone());
            history_crud
                .create(
                    user_id,
                    Some(issue_id),
                    Some(id),
                    None,
                    format!("updated comment from '{}' to '{}'", old_content, content),
                )
                .await?;
        }

        // Broadcast event
        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({"id": user_id}),
        );

        Ok(result)
    }

    pub async fn delete(&self, id: i32) -> Result<(), DbErr> {
        let txn = self.app_state.db.begin().await?;

        // Find the comment first to get details for history
        let comment_model = comment::Entity::find_by_id(id)
            .one(&txn)
            .await?
            .ok_or(DbErr::Custom("Comment not found".to_owned()))?;

        let user_id = comment_model.user_id;
        let issue_id = comment_model.issue_id;
        let content = comment_model.content.clone();

        // Delete all history records that reference this comment
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        history_crud.delete_by_comment_id(id).await?;

        // Delete the comment
        comment::Entity::delete_by_id(id).exec(&txn).await?;

        txn.commit().await?;

        // Add history entry for the deletion
        history_crud
            .create(
                user_id,
                Some(issue_id),
                None, // No comment_id since it's deleted
                None,
                format!("deleted comment: {}", content),
            )
            .await?;

        // Broadcast event
        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({"id": user_id}),
        );

        Ok(())
    }
}
