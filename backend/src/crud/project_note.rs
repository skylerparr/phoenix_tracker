use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::{
    PROJECT_NOTE_CREATED, PROJECT_NOTE_DELETED, PROJECT_NOTE_UPDATED,
};
use crate::entities::project_note;
use crate::AppState;
use chrono::Utc;
use sea_orm::*;

#[derive(Clone)]
pub struct ProjectNoteCrud {
    app_state: AppState,
}

impl ProjectNoteCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(
        &self,
        title: String,
        detail: String,
    ) -> Result<project_note::Model, DbErr> {
        let now = Utc::now();
        let project_id = &self.app_state.project.clone().unwrap().id;

        let project_note = project_note::ActiveModel {
            project_id: Set(*project_id),
            title: Set(title),
            detail: Set(detail),
            lock_version: Set(1),
            created_at: Set(now.into()),
            updated_at: Set(now.into()),
            ..Default::default()
        };

        let result = project_note.insert(&self.app_state.db).await?;

        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());

        // Spawn a new task for delayed broadcast
        let project_id_clone = *project_id;
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            broadcaster.broadcast_event(
                project_id_clone,
                PROJECT_NOTE_CREATED,
                serde_json::json!({ "project_id": project_id_clone }),
            );
        });

        Ok(result)
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<project_note::Model>, DbErr> {
        let project_id = &self.app_state.project.clone().unwrap().id;
        project_note::Entity::find_by_id(id)
            .filter(project_note::Column::ProjectId.eq(*project_id))
            .one(&self.app_state.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<project_note::Model>, DbErr> {
        let project_id = &self.app_state.project.clone().unwrap().id;
        project_note::Entity::find()
            .filter(project_note::Column::ProjectId.eq(*project_id))
            .order_by_asc(project_note::Column::CreatedAt)
            .all(&self.app_state.db)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        title: Option<String>,
        detail: Option<String>,
    ) -> Result<project_note::Model, DbErr> {
        let project_id = &self.app_state.project.clone().unwrap().id;
        let project_note = project_note::Entity::find_by_id(id)
            .filter(project_note::Column::ProjectId.eq(*project_id))
            .one(&self.app_state.db)
            .await?
            .ok_or(DbErr::Custom("Project note not found".to_owned()))?;

        let current_version = project_note.lock_version;
        let mut project_note: project_note::ActiveModel = project_note.into();

        let txn = self.app_state.db.begin().await?;

        if let Some(title) = title {
            project_note.title = Set(title);
        }

        if let Some(detail) = detail {
            project_note.detail = Set(detail);
        }

        project_note.lock_version = Set(current_version + 1);

        let result = project_note.clone().update(&txn).await?;
        if result.lock_version != current_version + 1 {
            txn.rollback().await?;
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }

        txn.commit().await?;
        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            PROJECT_NOTE_UPDATED,
            serde_json::json!({ "project_id": project_id }),
        );

        return Ok(result);
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        let project_id = &self.app_state.project.clone().unwrap().id;
        let _project_note = project_note::Entity::find_by_id(id)
            .filter(project_note::Column::ProjectId.eq(*project_id))
            .one(&self.app_state.db)
            .await?
            .ok_or(DbErr::Custom("Project note not found".to_owned()))?;

        let result = project_note::Entity::delete_by_id(id)
            .exec(&self.app_state.db)
            .await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            PROJECT_NOTE_DELETED,
            serde_json::json!({ "project_id": project_id }),
        );

        return Ok(result);
    }
}
