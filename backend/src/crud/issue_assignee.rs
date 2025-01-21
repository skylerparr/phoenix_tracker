use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::crud::history::HistoryCrud;
use crate::crud::user::UserCrud;
use crate::entities::issue_assignee;
use crate::AppState;
use sea_orm::*;

#[derive(Clone)]
pub struct IssueAssigneeCrud {
    app_state: AppState,
}

impl IssueAssigneeCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(
        &self,
        issue_id: i32,
        user_id: i32,
    ) -> Result<issue_assignee::Model, DbErr> {
        match self.find_by_ids(issue_id, user_id).await {
            Ok(Some(model)) => {
                return Ok(model);
            }
            _ => {
                let user_crud = UserCrud::new(self.app_state.db.clone());
                let user = user_crud.find_by_id(user_id).await?.unwrap();

                let history_crud = HistoryCrud::new(self.app_state.db.clone());
                let current_user_id = &self.app_state.user.clone().unwrap().id;

                history_crud
                    .create(
                        *current_user_id,
                        Some(issue_id),
                        None,
                        None,
                        format!("assigned to user '{}'", user.name),
                    )
                    .await?;

                let issue_assignee = issue_assignee::ActiveModel {
                    issue_id: Set(issue_id),
                    user_id: Set(user_id),
                    ..Default::default()
                };

                let result = issue_assignee.insert(&self.app_state.db).await?;

                let project_id = &self.app_state.project.clone().unwrap().id;
                let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
                broadcaster.broadcast_event(
                    *project_id,
                    ISSUE_UPDATED,
                    serde_json::json!({"id": user_id}),
                );

                Ok(result)
            }
        }
    }

    pub async fn find_by_ids(
        &self,
        issue_id: i32,
        user_id: i32,
    ) -> Result<Option<issue_assignee::Model>, DbErr> {
        issue_assignee::Entity::find()
            .filter(issue_assignee::Column::IssueId.eq(issue_id))
            .filter(issue_assignee::Column::UserId.eq(user_id))
            .one(&self.app_state.db)
            .await
    }

    pub async fn find_by_issue_id(
        &self,
        issue_id: i32,
    ) -> Result<Vec<issue_assignee::Model>, DbErr> {
        issue_assignee::Entity::find()
            .filter(issue_assignee::Column::IssueId.eq(issue_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn find_by_user_id(&self, user_id: i32) -> Result<Vec<issue_assignee::Model>, DbErr> {
        issue_assignee::Entity::find()
            .filter(issue_assignee::Column::UserId.eq(user_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn delete(&self, issue_id: i32, user_id: i32) -> Result<DeleteResult, DbErr> {
        let user_crud = UserCrud::new(self.app_state.db.clone());
        let user = user_crud.find_by_id(user_id).await?.unwrap();

        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        history_crud
            .create(
                *current_user_id,
                Some(issue_id),
                None,
                None,
                format!("unassigned from user '{}'", user.name),
            )
            .await?;

        let result = issue_assignee::Entity::delete_many()
            .filter(issue_assignee::Column::IssueId.eq(issue_id))
            .filter(issue_assignee::Column::UserId.eq(user_id))
            .exec(&self.app_state.db)
            .await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({"id": user_id}),
        );
        Ok(result)
    }

    pub async fn delete_all_by_issue_id(&self, issue_id: i32) -> Result<DeleteResult, DbErr> {
        issue_assignee::Entity::delete_many()
            .filter(issue_assignee::Column::IssueId.eq(issue_id))
            .exec(&self.app_state.db)
            .await
    }
}
