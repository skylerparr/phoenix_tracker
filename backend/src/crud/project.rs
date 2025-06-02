use crate::crud::issue::IssueCrud;
use crate::crud::notification::NotificationCrud;
use crate::crud::owner::OwnerCrud;
use crate::crud::user_setting::UserSettingCrud;
use crate::entities::issue;
use crate::entities::project;
use crate::entities::project_user;
use crate::AppState;
use chrono::{DateTime, FixedOffset};
use sea_orm::*;
use tracing::debug;

#[derive(Clone)]
pub struct ProjectCrud {
    state: AppState,
}

impl ProjectCrud {
    pub fn new(state: AppState) -> Self {
        Self { state }
    }

    pub async fn create(&self, name: String, owner_id: i32) -> Result<project::Model, DbErr> {
        let project = project::ActiveModel {
            name: Set(name),
            owner_id: Set(owner_id),
            ..Default::default()
        };

        project.insert(&self.state.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<project::Model>, DbErr> {
        project::Entity::find_by_id(id).one(&self.state.db).await
    }

    pub async fn find_all_projects_by_user_id(
        &self,
        user_id: i32,
    ) -> Result<Vec<project::Model>, DbErr> {
        debug!("Finding projects for user with ID: {}", user_id);

        // First get all the projects for this user
        let projects_query = project::Entity::find().filter(
            project::Column::Id.in_subquery(
                project_user::Entity::find()
                    .filter(project_user::Column::UserId.eq(user_id))
                    .select_only()
                    .column(project_user::Column::ProjectId)
                    .distinct()
                    .into_query(),
            ),
        );

        let projects = projects_query.all(&self.state.db).await?;

        // If there are no projects, return early
        if projects.is_empty() {
            return Ok(projects);
        }

        // Get all project IDs
        let project_ids: Vec<i32> = projects.iter().map(|p| p.id).collect();

        // Get the latest issue for each project
        let latest_issues = issue::Entity::find()
            .filter(issue::Column::ProjectId.is_in(project_ids.clone()))
            .order_by_desc(issue::Column::UpdatedAt)
            .all(&self.state.db)
            .await?;

        // Create a map of project ID to its latest issue updated timestamp
        let mut project_latest_update: std::collections::HashMap<i32, DateTime<FixedOffset>> =
            std::collections::HashMap::new();

        for issue_model in latest_issues {
            // Note: project_id is not an Option, so we access it directly
            let project_id = issue_model.project_id;
            if !project_latest_update.contains_key(&project_id) {
                project_latest_update.insert(project_id, issue_model.updated_at);
            }
        }

        // Get notification counts for each project
        let notification_crud = NotificationCrud::new(self.state.clone());
        let mut projects_with_notifications = Vec::new();

        for mut project in projects {
            let notification_count = notification_crud
                .get_unread_count_for_user_and_project(project.id, user_id)
                .await
                .unwrap_or(0);

            project.notification_count = notification_count;
            projects_with_notifications.push(project);
        }

        // Sort projects by their latest issue's updated_at timestamp
        projects_with_notifications.sort_by(|a, b| {
            let a_time = project_latest_update
                .get(&a.id)
                .cloned()
                .unwrap_or_else(|| a.created_at);
            let b_time = project_latest_update
                .get(&b.id)
                .cloned()
                .unwrap_or_else(|| b.created_at);
            b_time.cmp(&a_time) // Descending order
        });

        debug!(
            "Sorted project IDs: {:?}",
            projects_with_notifications
                .iter()
                .map(|project| project.id)
                .collect::<Vec<_>>()
        );

        Ok(projects_with_notifications)
    }

    pub async fn update(
        &self,
        id: i32,
        name: Option<String>,
        owner_id: Option<i32>,
    ) -> Result<project::Model, DbErr> {
        let project = project::Entity::find_by_id(id)
            .one(&self.state.db)
            .await?
            .ok_or(DbErr::Custom("Project not found".to_owned()))?;

        let mut project: project::ActiveModel = project.into();

        if let Some(name) = name {
            project.name = Set(name);
        }

        if let Some(owner_id) = owner_id {
            project.owner_id = Set(owner_id);
        }

        project.update(&self.state.db).await
    }

    pub async fn find_users_by_project_id(
        &self,
        project_id: i32,
    ) -> Result<Vec<project_user::Model>, DbErr> {
        debug!("Finding users for project with ID: {}", project_id);
        let query =
            project_user::Entity::find().filter(project_user::Column::ProjectId.eq(project_id));
        debug!(
            "Generated query: {:?}",
            query.build(self.state.db.get_database_backend())
        );
        match query.all(&self.state.db).await {
            Ok(data) => Ok(data),
            Err(e) => {
                debug!("Query error: {:?}", e);
                Err(e)
            }
        }
    }

    pub async fn delete_cascade(&self, id: i32) -> Result<DeleteResult, DbErr> {
        let project = self.find_by_id(id).await?;
        if project.is_none() {
            return Err(DbErr::Custom("Project not found".to_owned()));
        }

        let user_id = self.state.user.clone().unwrap().id;
        let user_setting_crud = UserSettingCrud::new(self.state.db.clone());
        user_setting_crud.update(user_id, None).await?;

        let issues = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(id))
            .all(&self.state.db)
            .await?;

        let issue_crud = IssueCrud::new(self.state.clone());

        for issue in issues {
            issue_crud.delete(issue.id).await?;
        }

        let notification_crud = NotificationCrud::new(self.state.clone());
        notification_crud.delete_all_for_project(id).await?;

        project_user::Entity::delete_many()
            .filter(project_user::Column::ProjectId.eq(id))
            .exec(&self.state.db)
            .await?;

        project::Entity::delete_by_id(id)
            .exec(&self.state.db)
            .await?;

        let owner_id = project.unwrap().owner_id.clone();
        let owner_crud = OwnerCrud::new(self.state.db.clone());
        owner_crud.delete(owner_id).await
    }
}
