use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::{ISSUE_CREATED, ISSUE_DELETED, ISSUE_UPDATED};
use crate::crud::status::get_unfinished_statuses;
use crate::entities::issue;
use crate::AppState;
use sea_orm::entity::prelude::*;
use sea_orm::*;

#[derive(Clone)]
pub struct IssueCrud {
    app_state: AppState,
}

impl IssueCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(
        &self,
        title: String,
        description: Option<String>,
        priority: i32,
        points: Option<Option<i32>>,
        status: i32,
        is_icebox: bool,
        work_type: i32,
        project_id: i32,
        target_release_at: Option<DateTimeWithTimeZone>,
        created_by_id: i32,
    ) -> Result<issue::Model, DbErr> {
        let issue = issue::ActiveModel {
            title: Set(title),
            description: Set(Some(description.unwrap_or_default())),
            priority: Set(priority),
            points: Set(points.unwrap_or_default()),
            status: Set(status),
            work_type: Set(work_type),
            project_id: Set(project_id),
            is_icebox: Set(is_icebox),
            created_by_id: Set(created_by_id),
            target_release_at: Set(target_release_at),
            ..Default::default()
        };

        let issue = issue.insert(&self.app_state.db).await?;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(project_id, ISSUE_CREATED, serde_json::json!(issue));
        Ok(issue)
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<issue::Model>, DbErr> {
        issue::Entity::find_by_id(id).one(&self.app_state.db).await
    }

    pub async fn find_all_for_backlog(
        &self,
        project_id: i32,
        is_icebox: bool,
        include_finished: bool,
    ) -> Result<Vec<issue::Model>, DbErr> {
        let mut query = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(project_id))
            .filter(issue::Column::IsIcebox.eq(is_icebox));

        if !include_finished {
            query = query.filter(issue::Column::Status.is_in(get_unfinished_statuses()));
        }

        query.all(&self.app_state.db).await
    }

    pub async fn update(
        &self,
        id: i32,
        title: Option<String>,
        description: Option<String>,
        priority: Option<i32>,
        points: Option<i32>,
        status: Option<i32>,
        is_icebox: Option<bool>,
        work_type: Option<i32>,
        target_release_at: Option<DateTimeWithTimeZone>,
        project_id: i32,
    ) -> Result<issue::Model, DbErr> {
        let txn = self.app_state.db.begin().await?;

        let issue = issue::Entity::find_by_id(id)
            .one(&txn)
            .await?
            .ok_or(DbErr::Custom("Issue not found".to_owned()))?;

        let current_version = issue.lock_version;
        let mut issue: issue::ActiveModel = issue.into();

        if let Some(title) = title {
            issue.title = Set(title);
        }

        if let Some(description) = description {
            issue.description = Set(Some(description));
        }

        if let Some(priority) = priority {
            issue.priority = Set(priority);
        }

        if let Some(points) = points {
            issue.points = Set(Some(points));
        }

        if let Some(status) = status {
            issue.status = Set(status);
        }

        if let Some(work_type) = work_type {
            issue.work_type = Set(work_type);
        }

        if let Some(target_release_at) = target_release_at {
            issue.target_release_at = Set(Some(target_release_at));
        }

        if let Some(is_icebox) = is_icebox {
            issue.is_icebox = Set(is_icebox);
        }

        issue.project_id = Set(project_id);
        issue.lock_version = Set(current_version + 1);

        let result = issue.update(&txn).await?;
        if result.lock_version != current_version + 1 {
            txn.rollback().await?;
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }

        txn.commit().await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(*project_id, ISSUE_UPDATED, serde_json::json!(result));

        Ok(result)
    }
    pub async fn set_icebox(&self, issue_id: i32, icebox: bool) -> Result<issue::Model, DbErr> {
        let txn = self.app_state.db.begin().await?;

        let issue = issue::Entity::find_by_id(issue_id)
            .one(&txn)
            .await?
            .ok_or(DbErr::Custom("Issue not found".to_owned()))?;

        let current_version = issue.lock_version;
        let mut issue: issue::ActiveModel = issue.into();
        issue.is_icebox = Set(icebox);
        issue.lock_version = Set(current_version + 1);

        let result = issue.update(&txn).await?;
        if result.lock_version != current_version + 1 {
            txn.rollback().await?;
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }

        txn.commit().await?;
        Ok(result)
    }
    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        let result = issue::Entity::delete_by_id(id)
            .exec(&self.app_state.db)
            .await?;
        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(*project_id, ISSUE_DELETED, serde_json::json!({ "id": id }));
        Ok(result)
    }
}
