use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::{
    PROJECT_NOTE_CREATED, PROJECT_NOTE_DELETED, PROJECT_NOTE_UPDATED,
};
use crate::crud::file_upload::FileUploadCrud;
use crate::crud::project_note_history::ProjectNoteHistoryCrud;
use crate::crud::project_note_parts::ProjectNotePartsCrud;
use crate::entities::project_note;
use crate::AppState;
use chrono::Utc;
use sea_orm::*;
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
            title: Set(title.clone()),
            detail: Set(detail.clone()),
            lock_version: Set(1),
            created_at: Set(now.into()),
            updated_at: Set(now.into()),
            ..Default::default()
        };

        let result = project_note.insert(&self.app_state.db).await?;
        let note_id = result.id;

        // Add history entry
        let history_crud = ProjectNoteHistoryCrud::new(self.app_state.db.clone());
        let current_user_id = self.app_state.user.as_ref().map(|u| u.id);
        history_crud
            .create(note_id, format!("created note: {}", title), current_user_id)
            .await?;

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
        let project_note_model = project_note::Entity::find_by_id(id)
            .filter(project_note::Column::ProjectId.eq(*project_id))
            .one(&self.app_state.db)
            .await?
            .ok_or(DbErr::Custom("Project note not found".to_owned()))?;

        let current_version = project_note_model.lock_version;
        let old_title = project_note_model.title.clone();
        let old_detail = project_note_model.detail.clone();
        let mut project_note: project_note::ActiveModel = project_note_model.into();

        let txn = self.app_state.db.begin().await?;

        let title_changed = title.as_ref().map(|t| t != &old_title).unwrap_or(false);
        let detail_changed = detail.as_ref().map(|d| d != &old_detail).unwrap_or(false);
        let new_title = title.clone();
        let new_detail = detail.clone();

        if let Some(title) = title {
            project_note.title = Set(title);
        }

        if let Some(detail) = detail {
            project_note.detail = Set(detail);
        }

        project_note.lock_version = Set(current_version + 1);

        // Update note row
        let result = project_note.clone().update(&txn).await?;
        if result.lock_version != current_version + 1 {
            txn.rollback().await?;
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }

        // Only store AST for the detail content
        if detail_changed {
            let parts_crud = ProjectNotePartsCrud::new(self.app_state.clone());
            parts_crud
                .store_markdown_ast(&txn, id, *project_id, &result.detail)
                .await?;
        }

        txn.commit().await?;

        // Add history entry if content changed
        if title_changed || detail_changed {
            let history_crud = ProjectNoteHistoryCrud::new(self.app_state.db.clone());
            let mut action = String::new();
            if title_changed {
                action.push_str(&format!(
                    "updated title from '{}' to '{}'",
                    old_title,
                    new_title.clone().unwrap_or_default()
                ));
            }
            if detail_changed {
                if !action.is_empty() {
                    action.push_str("; ");
                }
                action.push_str(&format!(
                    "updated detail from '{}' to '{}'",
                    old_detail,
                    new_detail.clone().unwrap_or_default()
                ));
            }
            let current_user_id = &self.app_state.user.clone().unwrap().id;
            history_crud
                .create(id, action, Some(*current_user_id))
                .await?;
        }

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

        // Delete all uploads associated with this project note
        let file_crud = FileUploadCrud::new(self.app_state.clone());
        file_crud.delete_all_by_project_note_id(id).await?;

        // Delete all history records for this project note
        let history_crud = ProjectNoteHistoryCrud::new(self.app_state.db.clone());
        history_crud.delete_by_project_note_id(id).await?;

        // Delete the project note itself
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

    pub async fn delete_all_by_project_id(&self, project_id: i32) -> Result<(), DbErr> {
        let current_project_id = self.app_state.project.clone().unwrap().id;
        if current_project_id != project_id {
            return Err(DbErr::Custom(
                "Project id mismatch with current context".to_owned(),
            ));
        }

        // Load all project notes for this project
        let notes = project_note::Entity::find()
            .filter(project_note::Column::ProjectId.eq(project_id))
            .order_by_asc(project_note::Column::CreatedAt)
            .all(&self.app_state.db)
            .await?;

        for n in notes {
            // Reuse existing deletion logic (removes uploads and broadcasts)
            self.delete(n.id).await?;
        }
        Ok(())
    }
}
