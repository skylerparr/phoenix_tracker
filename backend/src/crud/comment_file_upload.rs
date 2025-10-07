use crate::crud::event_broadcaster::{EventBroadcaster, ISSUE_UPDATED};
use crate::crud::file_upload::FileUploadCrud;
use crate::crud::history::HistoryCrud;
use crate::entities::{comment, comment_file_upload, file_upload};
use crate::AppState;
use sea_orm::*;

#[derive(Clone)]
pub struct CommentFileUploadCrud {
    app_state: AppState,
}

impl CommentFileUploadCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    // Creates an association between a comment and an existing file_upload
    // Validates that the file upload belongs to the same issue as the comment
    pub async fn create(
        &self,
        comment_id: i32,
        file_upload_id: i32,
    ) -> Result<comment_file_upload::Model, DbErr> {
        // If it already exists, return existing (idempotent create)
        if let Some(existing) = self.find_by_ids(comment_id, file_upload_id).await? {
            return Ok(existing);
        }

        // Load comment and file to validate domain rules
        let Some(comment_model) = comment::Entity::find_by_id(comment_id)
            .one(&self.app_state.db)
            .await?
        else {
            return Err(DbErr::Custom("Comment not found".into()));
        };

        let Some(file_model) = file_upload::Entity::find_by_id(file_upload_id)
            .one(&self.app_state.db)
            .await?
        else {
            return Err(DbErr::Custom("File upload not found".into()));
        };

        // Validation: comments attach to files that are owned by the same issue
        match file_model.issue_id {
            Some(issue_id) if issue_id == comment_model.issue_id => {}
            Some(_) => {
                return Err(DbErr::Custom(
                    "File upload belongs to a different issue than the comment".into(),
                ))
            }
            None => {
                return Err(DbErr::Custom(
                    "Cannot attach a project note file upload to an issue comment".into(),
                ))
            }
        }

        let mapping = comment_file_upload::ActiveModel {
            comment_id: Set(comment_id),
            file_upload_id: Set(file_upload_id),
            ..Default::default()
        }
        .insert(&self.app_state.db)
        .await?;

        // History entry
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = self
            .app_state
            .user
            .as_ref()
            .map(|u| u.id)
            .ok_or_else(|| DbErr::Custom("Current user not set on AppState".into()))?;
        let _ = history_crud
            .create(
                current_user_id,
                Some(comment_model.issue_id),
                Some(comment_id),
                None,
                format!(
                    "attached file '{}' to comment",
                    file_model.original_filename
                ),
            )
            .await?;

        // Broadcast update
        if let Some(project) = &self.app_state.project {
            let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
            broadcaster.broadcast_event(
                project.id,
                ISSUE_UPDATED,
                serde_json::json!({ "id": comment_model.issue_id }),
            );
        }

        Ok(mapping)
    }

    pub async fn find_by_ids(
        &self,
        comment_id: i32,
        file_upload_id: i32,
    ) -> Result<Option<comment_file_upload::Model>, DbErr> {
        comment_file_upload::Entity::find()
            .filter(comment_file_upload::Column::CommentId.eq(comment_id))
            .filter(comment_file_upload::Column::FileUploadId.eq(file_upload_id))
            .one(&self.app_state.db)
            .await
    }

    pub async fn find_by_comment_id(
        &self,
        comment_id: i32,
    ) -> Result<Vec<comment_file_upload::Model>, DbErr> {
        comment_file_upload::Entity::find()
            .filter(comment_file_upload::Column::CommentId.eq(comment_id))
            .order_by_asc(comment_file_upload::Column::CreatedAt)
            .all(&self.app_state.db)
            .await
    }

    pub async fn find_by_file_upload_id(
        &self,
        file_upload_id: i32,
    ) -> Result<Vec<comment_file_upload::Model>, DbErr> {
        comment_file_upload::Entity::find()
            .filter(comment_file_upload::Column::FileUploadId.eq(file_upload_id))
            .order_by_asc(comment_file_upload::Column::CreatedAt)
            .all(&self.app_state.db)
            .await
    }

    // New helper: return FileUpload models for a given comment id
    pub async fn find_uploads_by_comment_id(
        &self,
        comment_id: i32,
    ) -> Result<Vec<file_upload::Model>, DbErr> {
        let mut uploads = file_upload::Entity::find()
            .join(
                JoinType::InnerJoin,
                file_upload::Relation::CommentFileUpload.def(),
            )
            .filter(comment_file_upload::Column::CommentId.eq(comment_id))
            .order_by_asc(file_upload::Column::UploadedAt)
            .all(&self.app_state.db)
            .await?;

        // Populate browser-accessible URLs
        let file_crud = FileUploadCrud::new(self.app_state.clone());
        for u in &mut uploads {
            if u.full_url.is_none() {
                u.full_url = Some(file_crud.generate_browser_url(u).await?);
            }
        }

        Ok(uploads)
    }

    pub async fn delete(
        &self,
        comment_id: i32,
        file_upload_id: i32,
    ) -> Result<DeleteResult, DbErr> {
        // Fetch for history and broadcasting context (best-effort; ignore if missing)
        let comment_model = comment::Entity::find_by_id(comment_id)
            .one(&self.app_state.db)
            .await?;
        let file_model = file_upload::Entity::find_by_id(file_upload_id)
            .one(&self.app_state.db)
            .await?;

        let result = comment_file_upload::Entity::delete_many()
            .filter(comment_file_upload::Column::CommentId.eq(comment_id))
            .filter(comment_file_upload::Column::FileUploadId.eq(file_upload_id))
            .exec(&self.app_state.db)
            .await?;

        if let (Some(c), Some(f)) = (comment_model, file_model) {
            // History entry
            if let Some(current_user_id) = self.app_state.user.as_ref().map(|u| u.id) {
                let history_crud = HistoryCrud::new(self.app_state.db.clone());
                let _ = history_crud
                    .create(
                        current_user_id,
                        Some(c.issue_id),
                        Some(c.id),
                        None,
                        format!("removed attachment '{}' from comment", f.original_filename),
                    )
                    .await;
            }

            // Broadcast update
            if let Some(project) = &self.app_state.project {
                let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
                broadcaster.broadcast_event(
                    project.id,
                    ISSUE_UPDATED,
                    serde_json::json!({ "id": c.issue_id }),
                );
            }
        }

        Ok(result)
    }

    pub async fn delete_all_by_comment_id(&self, comment_id: i32) -> Result<DeleteResult, DbErr> {
        comment_file_upload::Entity::delete_many()
            .filter(comment_file_upload::Column::CommentId.eq(comment_id))
            .exec(&self.app_state.db)
            .await
    }

    // Delete all mappings for a given file upload within an existing transaction
    pub async fn delete_all_by_file_upload_id_txn(
        &self,
        file_upload_id: i32,
        txn: &DatabaseTransaction,
    ) -> Result<DeleteResult, DbErr> {
        comment_file_upload::Entity::delete_many()
            .filter(comment_file_upload::Column::FileUploadId.eq(file_upload_id))
            .exec(txn)
            .await
    }
}
