use crate::entities::{
    blocker, comment, history, issue, issue_assignee, issue_tag, owner, project, project_user, tag,
    task, user,
};
use crate::AppState;
use sea_orm::*;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Clone)]
pub struct ImportExportCrud {
    app_state: AppState,
}

impl ImportExportCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn export_all_data(&self) -> Result<HashMap<String, Vec<Value>>, DbErr> {
        let mut data = HashMap::new();

        // Export issues
        let issues = issue::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            issue::Entity::table_name(&issue::Entity).to_string(),
            vec![serde_json::to_value(issues).unwrap()],
        );

        // Export issue assignees
        let issue_assignees = issue_assignee::Entity::find()
            .all(&self.app_state.db)
            .await?;
        data.insert(
            issue_assignee::Entity::table_name(&issue_assignee::Entity).to_string(),
            vec![serde_json::to_value(issue_assignees).unwrap()],
        );

        // Export issue tags
        let issue_tags = issue_tag::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            issue_tag::Entity::table_name(&issue_tag::Entity).to_string(),
            vec![serde_json::to_value(issue_tags).unwrap()],
        );

        // Export comments
        let comments = comment::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            comment::Entity::table_name(&comment::Entity).to_string(),
            vec![serde_json::to_value(comments).unwrap()],
        );

        // Export tasks
        let tasks = task::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            task::Entity::table_name(&task::Entity).to_string(),
            vec![serde_json::to_value(tasks).unwrap()],
        );

        // Export blockers
        let blockers = blocker::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            blocker::Entity::table_name(&blocker::Entity).to_string(),
            vec![serde_json::to_value(blockers).unwrap()],
        );

        // Export tags
        let tags = tag::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            tag::Entity::table_name(&tag::Entity).to_string(),
            vec![serde_json::to_value(tags).unwrap()],
        );

        // Export projects
        let projects = project::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            project::Entity::table_name(&project::Entity).to_string(),
            vec![serde_json::to_value(projects).unwrap()],
        );

        // Export project users
        let project_users = project_user::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            project_user::Entity::table_name(&project_user::Entity).to_string(),
            vec![serde_json::to_value(project_users).unwrap()],
        );

        // Export users
        let users = user::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            user::Entity::table_name(&user::Entity).to_string(),
            vec![serde_json::to_value(users).unwrap()],
        );

        // Export owners
        let owners = owner::Entity::find().all(&self.app_state.db).await?;
        data.insert(
            owner::Entity::table_name(&owner::Entity).to_string(),
            vec![serde_json::to_value(owners).unwrap()],
        );

        Ok(data)
    }

    pub async fn import_data(&self, data: HashMap<String, Vec<Value>>) -> Result<(), DbErr> {
        // Clear all existing data first
        history::Entity::delete_many()
            .exec(&self.app_state.db)
            .await?;
        issue_tag::Entity::delete_many()
            .exec(&self.app_state.db)
            .await?;
        issue_assignee::Entity::delete_many()
            .exec(&self.app_state.db)
            .await?;
        blocker::Entity::delete_many()
            .exec(&self.app_state.db)
            .await?;
        comment::Entity::delete_many()
            .exec(&self.app_state.db)
            .await?;
        task::Entity::delete_many().exec(&self.app_state.db).await?;
        tag::Entity::delete_many().exec(&self.app_state.db).await?;
        issue::Entity::delete_many()
            .exec(&self.app_state.db)
            .await?;
        project_user::Entity::delete_many()
            .exec(&self.app_state.db)
            .await?;
        project::Entity::delete_many()
            .exec(&self.app_state.db)
            .await?;
        owner::Entity::delete_many()
            .exec(&self.app_state.db)
            .await?;
        user::Entity::delete_many().exec(&self.app_state.db).await?;
        // Import in order of dependencies

        // 1. Users
        if let Some(users) = data.get(&user::Entity::table_name(&user::Entity).to_string()) {
            for user_value in users {
                let user: user::Model = serde_json::from_value(user_value.clone())
                    .map_err(|e| DbErr::Custom(e.to_string()))?;
                user::ActiveModel::from(user)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        // 2. Projects
        if let Some(projects) = data.get(&project::Entity::table_name(&project::Entity).to_string())
        {
            for project_value in projects {
                let project: project::Model = serde_json::from_value(project_value.clone())
                    .map_err(|e| DbErr::Custom(e.to_string()))?;
                project::ActiveModel::from(project)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        // 3. Owners
        if let Some(owners) = data.get(&owner::Entity::table_name(&owner::Entity).to_string()) {
            for owner_value in owners {
                let owner: owner::Model = serde_json::from_value(owner_value.clone())
                    .map_err(|e| DbErr::Custom(e.to_string()))?;
                owner::ActiveModel::from(owner)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        // 4. Tags
        if let Some(tags) = data.get(&tag::Entity::table_name(&tag::Entity).to_string()) {
            for tag_value in tags {
                let tag: tag::Model = serde_json::from_value(tag_value.clone())
                    .map_err(|e| DbErr::Custom(e.to_string()))?;
                tag::ActiveModel::from(tag)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        // 5. Issues
        if let Some(issues) = data.get(&issue::Entity::table_name(&issue::Entity).to_string()) {
            for issue_value in issues {
                let issue: issue::Model = serde_json::from_value(issue_value.clone())
                    .map_err(|e| DbErr::Custom(e.to_string()))?;
                issue::ActiveModel::from(issue)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        // 6. Issue relationships
        if let Some(issue_assignees) =
            data.get(&issue_assignee::Entity::table_name(&issue_assignee::Entity).to_string())
        {
            for assignee_value in issue_assignees {
                let assignee: issue_assignee::Model =
                    serde_json::from_value(assignee_value.clone())
                        .map_err(|e| DbErr::Custom(e.to_string()))?;
                issue_assignee::ActiveModel::from(assignee)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        if let Some(issue_tags) =
            data.get(&issue_tag::Entity::table_name(&issue_tag::Entity).to_string())
        {
            for tag_value in issue_tags {
                let tag: issue_tag::Model = serde_json::from_value(tag_value.clone())
                    .map_err(|e| DbErr::Custom(e.to_string()))?;
                issue_tag::ActiveModel::from(tag)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        // 7. Issue-related content
        if let Some(comments) = data.get(&comment::Entity::table_name(&comment::Entity).to_string())
        {
            for comment_value in comments {
                let comment: comment::Model = serde_json::from_value(comment_value.clone())
                    .map_err(|e| DbErr::Custom(e.to_string()))?;
                comment::ActiveModel::from(comment)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        if let Some(tasks) = data.get(&task::Entity::table_name(&task::Entity).to_string()) {
            for task_value in tasks {
                let task: task::Model = serde_json::from_value(task_value.clone())
                    .map_err(|e| DbErr::Custom(e.to_string()))?;
                task::ActiveModel::from(task)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        if let Some(blockers) = data.get(&blocker::Entity::table_name(&blocker::Entity).to_string())
        {
            for blocker_value in blockers {
                let blocker: blocker::Model = serde_json::from_value(blocker_value.clone())
                    .map_err(|e| DbErr::Custom(e.to_string()))?;
                blocker::ActiveModel::from(blocker)
                    .insert(&self.app_state.db)
                    .await?;
            }
        }

        Ok(())
    }
}
