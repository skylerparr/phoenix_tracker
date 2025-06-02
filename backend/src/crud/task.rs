use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::crud::history::HistoryCrud;
use crate::crud::issue::IssueCrud;
use crate::crud::issue_assignee::IssueAssigneeCrud;
use crate::crud::notification::NotificationCrud;
use crate::entities::task;
use crate::AppState;
use sea_orm::*;
use std::collections::HashSet;
use tracing::debug;

#[derive(Clone)]
pub struct TaskCrud {
    app_state: AppState,
}

impl TaskCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(
        &self,
        title: String,
        issue_id: i32,
        completed: bool,
        percent: f32,
    ) -> Result<task::Model, DbErr> {
        // Add history record
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        history_crud
            .create(
                *current_user_id,
                Some(issue_id),
                None,
                None,
                "created task".to_string(),
            )
            .await?;

        debug!("Creating task for issue {}, title {}", issue_id, title);
        let txn = self.app_state.db.begin().await?;
        let task = task::ActiveModel {
            title: Set(title.clone()),
            issue_id: Set(issue_id),
            completed: Set(completed),
            percent: Set(percent),
            lock_version: Set(0),
            ..Default::default()
        };

        let result = task.insert(&txn).await?;

        // Create notifications for issue assignees and issue creator
        let issue_crud = IssueCrud::new(self.app_state.clone());
        if let Ok(Some(issue)) = issue_crud.find_by_id(issue_id).await {
            let notification_crud = NotificationCrud::new(self.app_state.clone());
            let issue_assignee_crud = IssueAssigneeCrud::new(self.app_state.clone());

            // Get issue assignees
            let mut target_user_ids = HashSet::new();
            if let Ok(assignees) = issue_assignee_crud.find_by_issue_id(issue_id).await {
                for assignee in assignees {
                    target_user_ids.insert(assignee.user_id);
                }
            }

            // Add issue creator
            target_user_ids.insert(issue.created_by_id);

            // Remove current user to avoid self-notification
            target_user_ids.remove(current_user_id);

            // Create notifications for each target user
            let project_id = &self.app_state.project.clone().unwrap().id;
            for target_user_id in target_user_ids {
                let notification_title = format!("New Task Created: {}", issue.title);
                let notification_description = format!("A new task '{}'.", title);

                let _ = notification_crud
                    .create(
                        notification_title,
                        notification_description,
                        *project_id,
                        issue_id,
                        *current_user_id,
                        target_user_id,
                    )
                    .await;
            }
        }

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({"issue_id": issue_id}),
        );

        txn.commit().await?;
        return Ok(result);
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<task::Model>, DbErr> {
        task::Entity::find_by_id(id).one(&self.app_state.db).await
    }

    pub async fn find_by_issue_id(&self, issue_id: i32) -> Result<Vec<task::Model>, DbErr> {
        task::Entity::find()
            .filter(task::Column::IssueId.eq(issue_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        title: Option<String>,
        completed: Option<bool>,
        percent: Option<f32>,
    ) -> Result<task::Model, DbErr> {
        let task = task::Entity::find_by_id(id)
            .one(&self.app_state.db)
            .await?
            .ok_or(DbErr::Custom("Cannot find task.".to_owned()))?;

        // Add history record
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        let mut changes = Vec::new();
        let mut notification_changes = Vec::new();

        if let Some(title) = &title {
            if title != &task.title {
                let change_msg = format!("title to '{}'", title);
                changes.push(change_msg.clone());
                notification_changes.push(change_msg);
            }
        }
        if let Some(completed) = completed {
            if completed != task.completed {
                let change_msg = if completed {
                    "completed".to_string()
                } else {
                    "uncompleted".to_string()
                };
                changes.push(change_msg.clone());
                notification_changes.push(change_msg);
            }
        }
        if let Some(percent) = percent {
            if percent != task.percent {
                let change_msg = format!("percent to {}", percent);
                changes.push(change_msg.clone());
                notification_changes.push(change_msg);
            }
        }

        if !changes.is_empty() {
            history_crud
                .create(
                    *current_user_id,
                    Some(task.issue_id),
                    None,
                    None,
                    format!("updated task '{}': {}", task.title, changes.join(", ")),
                )
                .await?;
        }

        let current_version = task.lock_version;

        let txn = self.app_state.db.begin().await?;
        let mut task: task::ActiveModel = task.into();
        if let Some(title) = title {
            task.title = Set(title);
        }
        if let Some(completed) = completed {
            task.completed = Set(completed);
        }
        if let Some(percent) = percent {
            task.percent = Set(percent);
        }
        task.lock_version = Set(current_version + 1);

        let result = task.clone().update(&txn).await?;
        if result.lock_version != current_version + 1 {
            txn.rollback().await?;
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }

        txn.commit().await?;

        // Create notifications for issue assignees and issue creator if there were changes
        if !notification_changes.is_empty() {
            let issue_crud = IssueCrud::new(self.app_state.clone());
            if let Ok(Some(issue)) = issue_crud.find_by_id(result.issue_id).await {
                let notification_crud = NotificationCrud::new(self.app_state.clone());
                let issue_assignee_crud = IssueAssigneeCrud::new(self.app_state.clone());

                // Get issue assignees
                let mut target_user_ids = HashSet::new();
                if let Ok(assignees) = issue_assignee_crud.find_by_issue_id(result.issue_id).await {
                    for assignee in assignees {
                        target_user_ids.insert(assignee.user_id);
                    }
                }

                // Add issue creator
                target_user_ids.insert(issue.created_by_id);

                // Remove current user to avoid self-notification
                target_user_ids.remove(current_user_id);

                // Create notifications for each target user
                let project_id = &self.app_state.project.clone().unwrap().id;
                for target_user_id in target_user_ids {
                    let notification_title = format!("Task Updated: {}", issue.title);
                    let notification_description = if notification_changes.is_empty() {
                        format!(
                            "Task '{}' in issue '{}' has been updated",
                            result.title, issue.title
                        )
                    } else {
                        format!(
                            "Task '{}' updated: {}",
                            result.title,
                            notification_changes.join(", ")
                        )
                    };

                    let _ = notification_crud
                        .create(
                            notification_title,
                            notification_description,
                            *project_id,
                            result.issue_id,
                            *current_user_id,
                            target_user_id,
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
            serde_json::json!({"issue_id": task.issue_id.unwrap()}),
        );
        Ok(result)
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        let task = task::Entity::find_by_id(id)
            .one(&self.app_state.db)
            .await?
            .ok_or(DbErr::Custom("Cannot find task.".to_owned()))?;

        // Add history record
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        history_crud
            .create(
                *current_user_id,
                Some(task.issue_id),
                None,
                None,
                format!("deleted task '{}'", task.title),
            )
            .await?;

        let result = task::Entity::delete_by_id(id)
            .exec(&self.app_state.db)
            .await?;

        // Create notifications for issue assignees and issue creator
        let issue_crud = IssueCrud::new(self.app_state.clone());
        if let Ok(Some(issue)) = issue_crud.find_by_id(task.issue_id).await {
            let notification_crud = NotificationCrud::new(self.app_state.clone());
            let issue_assignee_crud = IssueAssigneeCrud::new(self.app_state.clone());

            // Get issue assignees
            let mut target_user_ids = HashSet::new();
            if let Ok(assignees) = issue_assignee_crud.find_by_issue_id(task.issue_id).await {
                for assignee in assignees {
                    target_user_ids.insert(assignee.user_id);
                }
            }

            // Add issue creator
            target_user_ids.insert(issue.created_by_id);

            // Remove current user to avoid self-notification
            target_user_ids.remove(current_user_id);

            // Create notifications for each target user
            let project_id = &self.app_state.project.clone().unwrap().id;
            for target_user_id in target_user_ids {
                let notification_title = format!("Task Deleted: {}", issue.title);
                let notification_description = format!("Task '{}' was deleted.", task.title);

                let _ = notification_crud
                    .create(
                        notification_title,
                        notification_description,
                        *project_id,
                        task.issue_id,
                        *current_user_id,
                        target_user_id,
                    )
                    .await;
            }
        }

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({"issue_id": task.issue_id}),
        );

        Ok(result)
    }

    pub async fn delete_all_by_issue_id(&self, issue_id: i32) -> Result<DeleteResult, DbErr> {
        let result = task::Entity::delete_many()
            .filter(task::Column::IssueId.eq(issue_id))
            .exec(&self.app_state.db)
            .await?;

        Ok(result)
    }
}
