use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::crud::history::HistoryCrud;
use crate::crud::issue::IssueCrud;
use crate::crud::issue_assignee::IssueAssigneeCrud;
use crate::crud::notification::NotificationCrud;
use crate::entities::blocker;
use crate::AppState;
use sea_orm::*;

#[derive(Clone)]
pub struct BlockerCrud {
    app_state: AppState,
}

impl BlockerCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(&self, blocker_id: i32, blocked_id: i32) -> Result<blocker::Model, DbErr> {
        let model = self.find_by_ids(blocker_id, blocked_id).await?;
        if let Some(model) = model {
            return Ok(model);
        }

        let issue_crud = IssueCrud::new(self.app_state.clone());
        let blocker_issue = issue_crud.find_by_id(blocker_id).await?.unwrap();
        let blocked_issue = issue_crud.find_by_id(blocked_id).await?.unwrap();

        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        history_crud
            .create(
                *current_user_id,
                Some(blocker_id),
                None,
                None,
                format!("blocking issue '{}'", blocked_issue.title),
            )
            .await?;
        history_crud
            .create(
                *current_user_id,
                Some(blocked_id),
                None,
                None,
                format!("blocked by issue '{}'", blocker_issue.title),
            )
            .await?;

        let blocker = blocker::ActiveModel {
            blocker_id: Set(blocker_id),
            blocked_id: Set(blocked_id),
        };

        let result = blocker.insert(&self.app_state.db).await?;

        // Create notifications for assigned users on both issues (excluding the current user)
        let issue_assignee_crud = IssueAssigneeCrud::new(self.app_state.clone());
        let notification_crud = NotificationCrud::new(self.app_state.clone());
        let project_id = &self.app_state.project.clone().unwrap().id;

        // Notify assignees of the blocker issue
        if let Ok(blocker_assignees) = issue_assignee_crud.find_by_issue_id(blocker_id).await {
            for assignee in blocker_assignees {
                if assignee.user_id != *current_user_id {
                    let notification_title = format!("Issue Now Blocking: {}", blocked_issue.title);
                    let notification_description = format!(
                        "Your issue '{}' is now blocking issue '{}'",
                        blocker_issue.title, blocked_issue.title
                    );

                    let _ = notification_crud
                        .create(
                            notification_title,
                            notification_description,
                            *project_id,
                            blocker_id,
                            *current_user_id,
                            assignee.user_id,
                        )
                        .await;
                }
            }
        }

        // Notify assignees of the blocked issue
        if let Ok(blocked_assignees) = issue_assignee_crud.find_by_issue_id(blocked_id).await {
            for assignee in blocked_assignees {
                if assignee.user_id != *current_user_id {
                    let notification_title = format!("Issue Blocked: {}", blocked_issue.title);
                    let notification_description = format!(
                        "Your issue '{}' is now blocked by issue '{}'",
                        blocked_issue.title, blocker_issue.title
                    );

                    let _ = notification_crud
                        .create(
                            notification_title,
                            notification_description,
                            *project_id,
                            blocked_id,
                            *current_user_id,
                            assignee.user_id,
                        )
                        .await;
                }
            }
        }

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({ "id": blocker_id }),
        );

        Ok(result)
    }

    pub async fn find_by_ids(
        &self,
        blocker_id: i32,
        blocked_id: i32,
    ) -> Result<Option<blocker::Model>, DbErr> {
        blocker::Entity::find()
            .filter(blocker::Column::BlockerId.eq(blocker_id))
            .filter(blocker::Column::BlockedId.eq(blocked_id))
            .one(&self.app_state.db)
            .await
    }

    pub async fn find_by_blocker_id(&self, blocker_id: i32) -> Result<Vec<blocker::Model>, DbErr> {
        blocker::Entity::find()
            .filter(blocker::Column::BlockerId.eq(blocker_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn find_by_blocked_id(&self, blocked_id: i32) -> Result<Vec<blocker::Model>, DbErr> {
        blocker::Entity::find()
            .filter(blocker::Column::BlockedId.eq(blocked_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn delete(&self, blocker_id: i32, blocked_id: i32) -> Result<DeleteResult, DbErr> {
        let issue_crud = IssueCrud::new(self.app_state.clone());
        let blocker_issue = issue_crud.find_by_id(blocker_id).await?.unwrap();
        let blocked_issue = issue_crud.find_by_id(blocked_id).await?.unwrap();

        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        history_crud
            .create(
                *current_user_id,
                Some(blocker_id),
                None,
                None,
                format!("no longer blocking issue '{}'", blocked_issue.title),
            )
            .await?;
        history_crud
            .create(
                *current_user_id,
                Some(blocked_id),
                None,
                None,
                format!("no longer blocked by issue '{}'", blocker_issue.title),
            )
            .await?;

        let result = blocker::Entity::delete_many()
            .filter(blocker::Column::BlockerId.eq(blocker_id))
            .filter(blocker::Column::BlockedId.eq(blocked_id))
            .exec(&self.app_state.db)
            .await?;

        // Create notifications for assigned users on both issues (excluding the current user)
        let issue_assignee_crud = IssueAssigneeCrud::new(self.app_state.clone());
        let notification_crud = NotificationCrud::new(self.app_state.clone());
        let project_id = &self.app_state.project.clone().unwrap().id;

        // Notify assignees of the blocker issue
        if let Ok(blocker_assignees) = issue_assignee_crud.find_by_issue_id(blocker_id).await {
            for assignee in blocker_assignees {
                if assignee.user_id != *current_user_id {
                    let notification_title =
                        format!("Issue No Longer Blocking: {}", blocked_issue.title);
                    let notification_description = format!(
                        "Your issue '{}' is no longer blocking issue '{}'",
                        blocker_issue.title, blocked_issue.title
                    );

                    let _ = notification_crud
                        .create(
                            notification_title,
                            notification_description,
                            *project_id,
                            blocker_id,
                            *current_user_id,
                            assignee.user_id,
                        )
                        .await;
                }
            }
        }

        // Notify assignees of the blocked issue
        if let Ok(blocked_assignees) = issue_assignee_crud.find_by_issue_id(blocked_id).await {
            for assignee in blocked_assignees {
                if assignee.user_id != *current_user_id {
                    let notification_title =
                        format!("Issue No Longer Blocked: {}", blocked_issue.title);
                    let notification_description = format!(
                        "Your issue '{}' is no longer blocked by issue '{}'",
                        blocked_issue.title, blocker_issue.title
                    );

                    let _ = notification_crud
                        .create(
                            notification_title,
                            notification_description,
                            *project_id,
                            blocked_id,
                            *current_user_id,
                            assignee.user_id,
                        )
                        .await;
                }
            }
        }

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({ "id": blocker_id }),
        );

        Ok(result)
    }

    pub async fn delete_all_by_issue_id(&self, issue_id: i32) -> Result<DeleteResult, DbErr> {
        let result = blocker::Entity::delete_many()
            .filter(
                Condition::any()
                    .add(blocker::Column::BlockerId.eq(issue_id))
                    .add(blocker::Column::BlockedId.eq(issue_id)),
            )
            .exec(&self.app_state.db)
            .await?;

        Ok(result)
    }
}
