use crate::entities::project_note_tag;
use crate::AppState;
use sea_orm::sea_query::OnConflict;
use sea_orm::*;

pub struct ProjectNoteTagCrud {
    app_state: AppState,
}

impl ProjectNoteTagCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(
        &self,
        txn: &DatabaseTransaction,
        project_note_part_id: i32,
        project_id: i32,
        tag_name: &str,
    ) -> Result<(), DbErr> {
        let tag_active = project_note_tag::ActiveModel {
            project_note_part_id: Set(project_note_part_id),
            project_id: Set(project_id),
            tag_name: Set(tag_name.to_string()),
            ..Default::default()
        };

        // Upsert to avoid unique violation on (project_id, tag_name)
        project_note_tag::Entity::insert(tag_active)
            .on_conflict(
                OnConflict::columns([
                    project_note_tag::Column::ProjectId,
                    project_note_tag::Column::TagName,
                ])
                .do_nothing()
                .to_owned(),
            )
            .exec(txn)
            .await?;

        Ok(())
    }

    pub async fn delete(
        &self,
        txn: &DatabaseTransaction,
        project_id: i32,
        tag_name: &str,
    ) -> Result<DeleteResult, DbErr> {
        project_note_tag::Entity::delete_many()
            .filter(project_note_tag::Column::ProjectId.eq(project_id))
            .filter(project_note_tag::Column::TagName.eq(tag_name))
            .exec(txn)
            .await
    }

    pub async fn delete_many(
        &self,
        txn: &DatabaseTransaction,
        project_note_part_ids: Vec<i32>,
    ) -> Result<DeleteResult, DbErr> {
        if project_note_part_ids.is_empty() {
            return Ok(DeleteResult { rows_affected: 0 });
        }

        project_note_tag::Entity::delete_many()
            .filter(project_note_tag::Column::ProjectNotePartId.is_in(project_note_part_ids))
            .exec(txn)
            .await
    }

    pub async fn get_by_tag_name(
        &self,
        project_id: i32,
        tag_name: &str,
    ) -> Result<Vec<project_note_tag::Model>, DbErr> {
        project_note_tag::Entity::find()
            .filter(project_note_tag::Column::ProjectId.eq(project_id))
            .filter(project_note_tag::Column::TagName.eq(tag_name))
            .all(&self.app_state.db)
            .await
    }
}
