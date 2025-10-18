use crate::entities::project_note_history;
use sea_orm::*;

#[derive(Clone, Debug)]
pub struct ProjectNoteHistoryCrud {
    db: DatabaseConnection,
}

impl ProjectNoteHistoryCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        project_note_id: i32,
        action: String,
        user_id: Option<i32>,
    ) -> Result<project_note_history::Model, DbErr> {
        let project_note_history = project_note_history::ActiveModel {
            project_note_id: Set(project_note_id),
            action: Set(action),
            user_id: Set(user_id),
            ..Default::default()
        };

        project_note_history.insert(&self.db).await
    }

    pub async fn find_by_project_note_id(
        &self,
        project_note_id: i32,
    ) -> Result<Vec<project_note_history::Model>, DbErr> {
        project_note_history::Entity::find()
            .filter(project_note_history::Column::ProjectNoteId.eq(project_note_id))
            .order_by_desc(project_note_history::Column::CreatedAt)
            .all(&self.db)
            .await
    }

    pub async fn delete_by_project_note_id(
        &self,
        project_note_id: i32,
    ) -> Result<DeleteResult, DbErr> {
        project_note_history::Entity::delete_many()
            .filter(project_note_history::Column::ProjectNoteId.eq(project_note_id))
            .exec(&self.db)
            .await
    }
}
