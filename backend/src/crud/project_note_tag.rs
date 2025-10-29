use crate::entities::project_note;
use crate::entities::project_note_parts;
use crate::entities::project_note_tag;
use crate::entities::project_note_tag::ProjectNoteWithParts;
use crate::AppState;
use sea_orm::*;
use std::collections::HashMap;

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
            .exec(txn)
            .await?;

        Ok(())
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
    ) -> Result<Option<project_note_tag::Model>, DbErr> {
        let tags = project_note_tag::Entity::find()
            .filter(project_note_tag::Column::ProjectId.eq(project_id))
            .filter(project_note_tag::Column::TagName.eq(tag_name))
            .find_with_related(project_note_parts::Entity)
            .all(&self.app_state.db)
            .await?;

        if tags.is_empty() {
            return Ok(None);
        }

        let mut combined_parts = Vec::new();
        let mut first_tag = None;

        for (tag_model, parts) in tags {
            if first_tag.is_none() {
                first_tag = Some(tag_model);
            }
            combined_parts.extend(parts);
        }

        // Group parts by project_note_id
        let mut grouped_by_note: HashMap<i32, Vec<project_note_parts::Model>> = HashMap::new();
        for part in combined_parts {
            grouped_by_note
                .entry(part.project_note_id)
                .or_insert_with(Vec::new)
                .push(part);
        }

        // Get all unique project_note_ids to fetch their titles
        let note_ids: Vec<i32> = grouped_by_note.keys().cloned().collect();

        // Fetch project notes with titles
        let notes = project_note::Entity::find()
            .filter(project_note::Column::Id.is_in(note_ids))
            .all(&self.app_state.db)
            .await?;

        // Create a map of note_id -> title
        let note_titles: HashMap<i32, String> = notes
            .into_iter()
            .map(|note| (note.id, note.title))
            .collect();

        // Build the final structure
        let mut project_note_parts_grouped: Vec<ProjectNoteWithParts> = grouped_by_note
            .into_iter()
            .filter_map(|(note_id, mut parts)| {
                note_titles.get(&note_id).map(|title| {
                    parts.sort_by(|a, b| a.created_at.cmp(&b.created_at));
                    ProjectNoteWithParts {
                        id: note_id,
                        title: title.clone(),
                        parts,
                    }
                })
            })
            .collect();

        // Sort by note id for consistent ordering
        project_note_parts_grouped.sort_by(|a, b| a.id.cmp(&b.id));

        Ok(first_tag.map(|mut tag_model| {
            tag_model.project_note_parts = project_note_parts_grouped;
            tag_model
        }))
    }
}
