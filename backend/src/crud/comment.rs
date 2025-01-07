use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
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
            content: Set(content),
            issue_id: Set(issue_id),
            user_id: Set(user_id),
            ..Default::default()
        };

        let result = comment.insert(&self.app_state.db).await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({"user_id": user_id}),
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

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        comment::Entity::delete_by_id(id)
            .exec(&self.app_state.db)
            .await
    }
}
