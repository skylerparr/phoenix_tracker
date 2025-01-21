use super::event_broadcaster::TAG_DELETED;
use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::crud::history::HistoryCrud;
use crate::crud::tag::TagCrud;
use crate::entities::issue_tag;
use crate::AppState;
use sea_orm::*;

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

        let tag_crud = TagCrud::new(self.app_state.clone());
        let tag = tag_crud.find_by_id(tag_id).await?.unwrap();

        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        history_crud
            .create(
                *current_user_id,
                Some(issue_id),
                None,
                None,
                format!("added label '{}'", tag.name),
            )
            .await?;

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
            .order_by_asc(issue_tag::Column::CreatedAt)
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
        let tag_crud = TagCrud::new(self.app_state.clone());
        let tag = tag_crud.find_by_id(tag_id).await?.unwrap();

        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        history_crud
            .create(
                *current_user_id,
                Some(issue_id),
                None,
                None,
                format!("removed label '{}'", tag.name),
            )
            .await?;

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
        let tag_crud = TagCrud::new(self.app_state.clone());
        let tag = tag_crud.find_by_id(tag_id).await?.unwrap();

        let issues = self.find_by_tag_id(tag_id).await?;
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        for issue in issues {
            history_crud
                .create(
                    *current_user_id,
                    Some(issue.issue_id),
                    None,
                    None,
                    format!("label '{}' was deleted", tag.name),
                )
                .await?;
        }

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
