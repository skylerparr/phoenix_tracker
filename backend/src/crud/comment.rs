use crate::crud::comment_file_upload::CommentFileUploadCrud;
use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::crud::file_upload::FileUploadCrud;
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
            .order_by(comment::Column::CreatedAt, Order::Asc)
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
        // Load all comments for this issue, then delete each using the single-comment
        // delete path to ensure associated uploads and mappings are cleaned up.
        let txn = self.app_state.db.begin().await?;
        let comments = self.find_by_issue_id(issue_id).await?;
        let mut rows: u64 = 0;
        for c in comments {
            let comment_id = c.id;

            // Find all uploads attached to this comment (use txn-aware variant)
            let cfu_crud = CommentFileUploadCrud::new(self.app_state.clone());
            let uploads = cfu_crud
                .find_uploads_by_comment_id_txn(comment_id, &txn)
                .await?;

            // Delete each upload (record + stored file) without creating history, inside the same txn
            let file_crud = FileUploadCrud::new(self.app_state.clone());
            for u in uploads {
                file_crud.delete_with_no_history_txn(u.id, &txn).await?;
                // Also remove the specific mapping for this comment (noop if already removed by upload deletion)
                let _ = cfu_crud.delete_txn(comment_id, u.id, &txn).await?;
            }

            // Delete all history records that reference this comment (set comment_id to NULL)
            let history_crud = HistoryCrud::new(self.app_state.db.clone());
            history_crud.delete_by_comment_id(comment_id).await?;

            // Delete the comment
            comment::Entity::delete_by_id(comment_id).exec(&txn).await?;

            rows += 1;
        }
        txn.commit().await?;
        Ok(DeleteResult {
            rows_affected: rows,
        })
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

        // Find all uploads attached to this comment (use txn-aware variant)
        let cfu_crud = CommentFileUploadCrud::new(self.app_state.clone());
        let uploads = cfu_crud.find_uploads_by_comment_id_txn(id, &txn).await?;

        // Delete each upload (record + stored file) without creating history, inside the same txn
        let file_crud = FileUploadCrud::new(self.app_state.clone());
        for u in uploads {
            file_crud.delete_with_no_history_txn(u.id, &txn).await?;
            // Also remove the specific mapping for this comment (noop if already removed by upload deletion)
            let _ = cfu_crud.delete_txn(id, u.id, &txn).await?;
        }

        // Delete all history records that reference this comment (set comment_id to NULL)
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
