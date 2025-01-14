use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::entities::issue_tag;
use crate::AppState;
use sea_orm::*;

use super::event_broadcaster::TAG_DELETED;

#[derive(Clone)]
pub struct IssueTagCrud {
    app_state: AppState,
}

impl IssueTagCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }
    pub async fn create(&self, issue_id: i32, tag_id: i32) -> Result<issue_tag::Model, DbErr> {
        let model = self.find_by_ids(issue_id, tag_id).await?;
        if let Some(model) = model {
            return Ok(model);
        }
        let issue_tag = issue_tag::ActiveModel {
            issue_id: Set(issue_id),
            tag_id: Set(tag_id),
            ..Default::default()
        };

        let result = issue_tag.insert(&self.app_state.db).await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({ "id": issue_id }),
        );

        Ok(result)
    }

    pub async fn find_by_ids(
        &self,
        issue_id: i32,
        tag_id: i32,
    ) -> Result<Option<issue_tag::Model>, DbErr> {
        issue_tag::Entity::find()
            .filter(issue_tag::Column::IssueId.eq(issue_id))
            .filter(issue_tag::Column::TagId.eq(tag_id))
            .one(&self.app_state.db)
            .await
    }

    pub async fn find_by_issue_id(&self, issue_id: i32) -> Result<Vec<issue_tag::Model>, DbErr> {
        issue_tag::Entity::find()
            .filter(issue_tag::Column::IssueId.eq(issue_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn find_by_tag_id(&self, tag_id: i32) -> Result<Vec<issue_tag::Model>, DbErr> {
        issue_tag::Entity::find()
            .filter(issue_tag::Column::TagId.eq(tag_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn delete(&self, issue_id: i32, tag_id: i32) -> Result<DeleteResult, DbErr> {
        let result = issue_tag::Entity::delete_many()
            .filter(issue_tag::Column::IssueId.eq(issue_id))
            .filter(issue_tag::Column::TagId.eq(tag_id))
            .exec(&self.app_state.db)
            .await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({ "id": issue_id }),
        );

        Ok(result)
    }

    pub async fn delete_all_by_issue_id(&self, issue_id: i32) -> Result<DeleteResult, DbErr> {
        issue_tag::Entity::delete_many()
            .filter(issue_tag::Column::IssueId.eq(issue_id))
            .exec(&self.app_state.db)
            .await
    }

    pub async fn delete_by_tag_id(&self, tag_id: i32) -> Result<DeleteResult, DbErr> {
        let result = issue_tag::Entity::delete_many()
            .filter(issue_tag::Column::TagId.eq(tag_id))
            .exec(&self.app_state.db)
            .await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            TAG_DELETED,
            serde_json::json!({ "project_id": project_id }),
        );

        return Ok(result);
    }
}
