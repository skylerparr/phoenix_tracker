use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::crud::history::HistoryCrud;
use crate::{entities::task, AppState};
use sea_orm::*;
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
            title: Set(title),
            issue_id: Set(issue_id),
            completed: Set(completed),
            percent: Set(percent),
            lock_version: Set(0),
            ..Default::default()
        };

        let result = task.insert(&txn).await?;

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
        if let Some(title) = &title {
            if title != &task.title {
                changes.push(format!("title to '{}'", title));
            }
        }
        if let Some(completed) = completed {
            if completed != task.completed {
                if completed {
                    changes.push("completed".to_string());
                } else {
                    changes.push("uncompleted".to_string());
                }
            }
        }
        if let Some(percent) = percent {
            if percent != task.percent {
                changes.push(format!("percent to {}", percent));
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
