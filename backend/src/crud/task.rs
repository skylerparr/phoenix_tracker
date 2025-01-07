use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
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
        let txn = self.app_state.db.begin().await?;

        debug!("Creating task for issue {}, title {}", issue_id, title);
        let task = task::ActiveModel {
            title: Set(title),
            issue_id: Set(issue_id),
            completed: Set(completed),
            percent: Set(percent),
            lock_version: Set(0), // Initialize lock version
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
        let txn = self.app_state.db.begin().await?;

        let task = task::Entity::find_by_id(id)
            .one(&txn)
            .await?
            .ok_or(DbErr::Custom("Cannot find task.".to_owned()))?;

        let current_version = task.lock_version;

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
}
