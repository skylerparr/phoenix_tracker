use crate::crud::blocker::BlockerCrud;
use crate::crud::comment::CommentCrud;
use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::{ISSUE_CREATED, ISSUE_DELETED, ISSUE_UPDATED};
use crate::crud::history::HistoryCrud;
use crate::crud::issue_assignee::IssueAssigneeCrud;
use crate::crud::issue_tag::IssueTagCrud;
use crate::crud::notification::NotificationCrud;
use crate::crud::project_user::ProjectUserCrud;
use crate::crud::status::STATUS_MAP;
use crate::crud::status::{STATUS_ACCEPTED, STATUS_REJECTED, STATUS_UNSTARTED};
use crate::crud::task::TaskCrud;
use crate::crud::work_type::{WORK_TYPE_FEATURE, WORK_TYPE_MAP};
use crate::entities::issue;
use crate::entities::issue_assignee;
use crate::entities::issue_tag;
use crate::AppState;
use chrono::Datelike;
use sea_orm::entity::prelude::*;
use sea_orm::*;
use std::collections::HashSet;

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
            title: Set(title.clone()), // Clone title before moving
            description: Set(Some(description.clone().unwrap_or_default())),
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
        let mut issue = issue.insert(&self.app_state.db).await?;

        let work_type_name = WORK_TYPE_MAP.get(&work_type).unwrap_or(&"Unknown");
        let history_record = format!(
            "created new {} with title: {}, description: {}, points: {:?}",
            work_type_name,
            title.clone(),
            description.as_ref().map_or_else(String::new, |d| d.clone()),
            points.unwrap_or_default()
        );
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        history_crud
            .create(created_by_id, Some(issue.id), None, None, history_record)
            .await?;

        self.populate_issue_tags(&mut issue).await?;
        self.populate_issue_assignees(&mut issue).await?;

        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(project_id, ISSUE_CREATED, serde_json::json!(issue));

        Ok(issue)
    }

    async fn populate_issue_tags(&self, issue: &mut issue::Model) -> Result<(), DbErr> {
        let tag_ids = IssueTagCrud::new(self.app_state.clone())
            .find_by_issue_id(issue.id)
            .await?
            .into_iter()
            .map(|tag| tag.tag_id)
            .collect();
        issue.issue_tag_ids = tag_ids;
        Ok(())
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<issue::Model>, DbErr> {
        let mut issue = issue::Entity::find_by_id(id)
            .one(&self.app_state.db)
            .await?;
        if let Some(ref mut issue) = issue {
            self.populate_issue_tags(issue).await?;
            self.populate_issue_assignees(issue).await?;
        }
        Ok(issue)
    }

    pub async fn find_all_for_backlog(&self, project_id: i32) -> Result<Vec<issue::Model>, DbErr> {
        let now = chrono::Utc::now().date_naive();
        let days_from_monday = now.weekday().num_days_from_monday();
        let monday = now - chrono::Duration::days(days_from_monday as i64);

        let mut issues = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(project_id))
            .filter(issue::Column::IsIcebox.eq(false))
            .filter(
                Condition::any()
                    .add(issue::Column::Status.ne(STATUS_ACCEPTED))
                    .add(
                        Condition::all()
                            .add(issue::Column::Status.eq(STATUS_ACCEPTED))
                            .add(issue::Column::AcceptedAt.gte(monday)),
                    ),
            )
            .order_by(issue::Column::Priority, Order::Asc)
            .all(&self.app_state.db)
            .await?;

        for issue in &mut issues {
            self.populate_issue_tags(issue).await?;
            self.populate_issue_assignees(issue).await?;
        }

        Ok(self.schedule_issues(issues).await?)
    }

    async fn populate_issue_assignees(&self, issue: &mut issue::Model) -> Result<(), DbErr> {
        let assignee_user_ids = issue_assignee::Entity::find()
            .filter(issue_assignee::Column::IssueId.eq(issue.id))
            .all(&self.app_state.db)
            .await?
            .into_iter()
            .map(|assignee| assignee.user_id)
            .collect();

        issue.issue_assignee_ids = assignee_user_ids;

        Ok(())
    }

    async fn schedule_issues(&self, issues: Vec<issue::Model>) -> Result<Vec<issue::Model>, DbErr> {
        let mut scheduled_issues = issues;
        let project_id = &self.app_state.project.clone().unwrap().id;
        let weekly_average = self.calculate_weekly_points_average(*project_id).await?;

        let now = chrono::Utc::now();
        let days_from_monday = now.weekday().num_days_from_monday();
        let this_monday = now.date_naive() - chrono::Duration::days(days_from_monday as i64);
        let mut current_monday = this_monday;

        let mut current_week_points = 0;

        for issue in &mut scheduled_issues {
            let issue_points = issue.points.unwrap_or(0);

            if issue.status != STATUS_UNSTARTED && issue.status != STATUS_REJECTED {
                issue.scheduled_at = Some(
                    this_monday
                        .and_time(chrono::NaiveTime::default())
                        .and_utc()
                        .into(),
                );
            } else {
                if current_week_points + issue_points >= weekly_average as i32 {
                    current_monday = current_monday + chrono::Duration::days(7);
                    current_week_points = issue_points;
                } else {
                    current_week_points += issue_points;
                }

                issue.scheduled_at = Some(
                    current_monday
                        .and_time(chrono::NaiveTime::default())
                        .and_utc()
                        .into(),
                );
            }
        }

        Ok(scheduled_issues)
    }
    pub async fn find_all_accepted(&self, project_id: i32) -> Result<Vec<issue::Model>, DbErr> {
        let mut issues = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(project_id))
            .filter(issue::Column::Status.eq(STATUS_ACCEPTED))
            .order_by(issue::Column::UpdatedAt, Order::Desc)
            .all(&self.app_state.db)
            .await?;
        for issue in &mut issues {
            self.populate_issue_tags(issue).await?;
            self.populate_issue_assignees(issue).await?;
        }
        Ok(issues)
    }
    pub async fn find_all_icebox(&self, project_id: i32) -> Result<Vec<issue::Model>, DbErr> {
        let mut issues = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(project_id))
            .filter(issue::Column::IsIcebox.eq(true))
            .order_by(issue::Column::UpdatedAt, Order::Desc)
            .all(&self.app_state.db)
            .await?;

        for issue in &mut issues {
            self.populate_issue_tags(issue).await?;
            self.populate_issue_assignees(issue).await?;
        }
        Ok(issues)
    }

    pub async fn find_all_by_user_id(
        &self,
        project_id: i32,
        user_id: i32,
    ) -> Result<Vec<issue::Model>, DbErr> {
        let now = chrono::Utc::now().date_naive();
        let days_from_monday = now.weekday().num_days_from_monday();
        let monday = now - chrono::Duration::days(days_from_monday as i64);

        let mut issues = issue_assignee::Entity::find()
            .filter(issue_assignee::Column::UserId.eq(user_id))
            .find_also_related(issue::Entity)
            .filter(issue::Column::ProjectId.eq(project_id))
            .filter(
                Condition::any()
                    .add(issue::Column::Status.ne(STATUS_ACCEPTED))
                    .add(
                        Condition::all()
                            .add(issue::Column::Status.eq(STATUS_ACCEPTED))
                            .add(issue::Column::UpdatedAt.gte(monday)),
                    ),
            )
            .all(&self.app_state.db)
            .await?
            .into_iter()
            .filter_map(|(_, issue)| issue)
            .collect::<Vec<issue::Model>>();

        for issue in &mut issues {
            self.populate_issue_tags(issue).await?;
            self.populate_issue_assignees(issue).await?;
        }
        Ok(issues)
    }
    pub async fn find_all_by_tag_id(&self, tag_id: i32) -> Result<Vec<issue::Model>, DbErr> {
        let mut issues = issue_tag::Entity::find()
            .filter(issue_tag::Column::TagId.eq(tag_id))
            .find_also_related(issue::Entity)
            .all(&self.app_state.db)
            .await?
            .into_iter()
            .filter_map(|(_, issue)| issue)
            .collect::<Vec<issue::Model>>();

        for issue in &mut issues {
            self.populate_issue_tags(issue).await?;
            self.populate_issue_assignees(issue).await?;
        }
        Ok(issues)
    }

    pub async fn count_issues_by_tag_ids(
        &self,
        tag_ids: Vec<i32>,
    ) -> Result<Vec<(i32, i64)>, DbErr> {
        let counts = issue_tag::Entity::find()
            .filter(issue_tag::Column::TagId.is_in(tag_ids))
            .group_by(issue_tag::Column::TagId)
            .select_only()
            .column(issue_tag::Column::TagId)
            .column_as(issue_tag::Column::IssueId.count(), "count")
            .into_tuple()
            .all(&self.app_state.db)
            .await?;

        Ok(counts)
    }

    pub async fn update(
        &self,
        id: i32,
        title: Option<String>,
        description: Option<String>,
        priority: Option<i32>,
        points: Option<Option<i32>>,
        status: Option<i32>,
        is_icebox: Option<bool>,
        work_type: Option<i32>,
        target_release_at: Option<DateTimeWithTimeZone>,
        accepted_at: Option<DateTimeWithTimeZone>,
    ) -> Result<issue::Model, DbErr> {
        let txn = self.app_state.db.begin().await?;
        let issue = issue::Entity::find_by_id(id)
            .one(&txn)
            .await?
            .ok_or(DbErr::Custom("Issue not found".to_owned()))?;

        let project_id = issue.project_id.clone();
        let issue_created_by_id = issue.created_by_id.clone();
        let issue_title = issue.title.clone();
        let mut history_records = Vec::new();
        let current_user_id = &self.app_state.user.clone().unwrap().id;
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_version = issue.lock_version;
        let mut issue: issue::ActiveModel = issue.into();

        // Points update
        if let Some(new_points) = points {
            let old_points = issue
                .points
                .clone()
                .unwrap()
                .map(|p| p.to_string())
                .unwrap_or("none".to_string());
            let new_points_str = new_points
                .map(|p| p.to_string())
                .unwrap_or("none".to_string());
            history_records.push(format!(
                "updated points from {} to {}",
                old_points, new_points_str
            ));
            match new_points {
                Some(p) => issue.points = Set(Some(p)),
                None => issue.points = Set(None),
            }
        }

        // Status update
        let mut status_changed = false;
        if let Some(new_status) = status {
            let old_status = issue.status.clone().unwrap();
            history_records.push(format!(
                "changed status from '{}' to '{}'",
                STATUS_MAP.get(&old_status).unwrap_or(&"unknown"),
                STATUS_MAP.get(&new_status).unwrap_or(&"unknown")
            ));
            issue.status = Set(new_status);
            status_changed = true;
        }

        // Work type update
        if let Some(new_work_type) = work_type {
            let old_work_type = issue.work_type.clone().unwrap();
            history_records.push(format!(
                "changed type from '{}' to '{}', points will are set to `Unestimated`.",
                WORK_TYPE_MAP.get(&old_work_type).unwrap_or(&"unknown"),
                WORK_TYPE_MAP.get(&new_work_type).unwrap_or(&"unknown")
            ));
            issue.work_type = Set(new_work_type);
            if new_work_type != WORK_TYPE_FEATURE {
                issue.points = Set(None);
            }
        }

        // Title update
        if let Some(new_title) = title {
            let old_title = issue.title.clone().unwrap();
            if old_title != new_title {
                history_records.push(format!(
                    "changed title from '{}' to '{}'",
                    old_title, new_title
                ));
                issue.title = Set(new_title);
            }
        }

        // Description update
        if let Some(new_description) = description {
            let old_description = issue.description.clone().unwrap().unwrap_or_default();
            if old_description != new_description {
                history_records.push(format!(
                    "updated description from '{}' to '{}'",
                    old_description, new_description
                ));
                issue.description = Set(Some(new_description));
            }
        }

        // Priority update
        if let Some(new_priority) = priority {
            let old_priority = issue.priority.clone().unwrap();
            if old_priority != new_priority {
                history_records.push(format!(
                    "changed priority from '{}' to '{}'",
                    old_priority, new_priority
                ));
                issue.priority = Set(new_priority);
            }
        }

        // Target release date update
        if let Some(new_target_release) = target_release_at {
            history_records.push(format!(
                "set target release date to '{}'",
                new_target_release
            ));
            issue.target_release_at = Set(Some(new_target_release));
        }

        // Icebox status update
        if let Some(new_is_icebox) = is_icebox {
            let old_is_icebox = issue.is_icebox.clone().unwrap();
            if old_is_icebox != new_is_icebox {
                if new_is_icebox {
                    history_records.push("moved to icebox.".to_string());
                } else {
                    history_records.push("moved to backlog.".to_string());
                }
                issue.is_icebox = Set(new_is_icebox);
                if new_is_icebox {
                    issue.status = Set(STATUS_UNSTARTED);
                }
            }
        }

        // Accepted date update
        if let Some(new_accepted_at) = accepted_at {
            history_records.push(format!("accepted on '{}'", new_accepted_at));
            issue.accepted_at = Set(Some(new_accepted_at));
        }

        issue.lock_version = Set(current_version + 1);
        let mut result = issue.update(&txn).await?;
        if result.lock_version != current_version + 1 {
            txn.rollback().await?;
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }

        txn.commit().await?;

        if status_changed {
            let issue_assignee_crud = IssueAssigneeCrud::new(self.app_state.clone());
            issue_assignee_crud.create(id, *current_user_id).await?;
        }

        // Record history items
        for record in history_records {
            history_crud
                .create(*current_user_id, Some(id), None, None, record)
                .await?;
        }

        // Create notifications for project owners and issue requester
        let notification_crud = NotificationCrud::new(self.app_state.clone());
        let project_user_crud = ProjectUserCrud::new(self.app_state.clone());

        // Get project users
        let project_users = project_user_crud.get_users_for_project(project_id).await?;
        let mut target_user_ids = HashSet::new();

        // Add all project users
        for project_user in project_users {
            target_user_ids.insert(project_user.user_id);
        }

        // Add issue requester/creator
        target_user_ids.insert(issue_created_by_id);

        // Remove current user to avoid self-notification
        target_user_ids.remove(current_user_id);

        // Create notifications for each target user
        for target_user_id in target_user_ids {
            let notification_title = format!("Issue Updated: {}", issue_title);
            let notification_description = format!("Issue '{}' has been updated", issue_title);

            let _ = notification_crud
                .create(
                    notification_title,
                    notification_description,
                    project_id,
                    id,
                    *current_user_id,
                    target_user_id,
                )
                .await;
        }

        self.populate_issue_tags(&mut result).await?;
        self.populate_issue_assignees(&mut result).await?;

        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(project_id, ISSUE_UPDATED, serde_json::json!(result));

        Ok(result)
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        history_crud.delete_by_issue_id(id).await?;

        let issue_assignee_crud = IssueAssigneeCrud::new(self.app_state.clone());
        issue_assignee_crud.delete_all_by_issue_id(id).await?;

        let issue_tag_crud = IssueTagCrud::new(self.app_state.clone());
        issue_tag_crud.delete_all_by_issue_id(id).await?;

        let comment_crud = CommentCrud::new(self.app_state.clone());
        comment_crud.delete_all_by_issue_id(id).await?;

        let task_crud = TaskCrud::new(self.app_state.clone());
        task_crud.delete_all_by_issue_id(id).await?;
        let blocker_crud = BlockerCrud::new(self.app_state.clone());
        blocker_crud.delete_all_by_issue_id(id).await?;

        let result = issue::Entity::delete_by_id(id)
            .exec(&self.app_state.db)
            .await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(*project_id, ISSUE_DELETED, serde_json::json!({ "id": id }));

        Ok(result)
    }

    pub async fn bulk_update_priorities(
        &self,
        issue_priorities: Vec<(i32, i32)>,
    ) -> Result<Vec<issue::Model>, DbErr> {
        let mut updated_issues = Vec::new();
        let history_crud = HistoryCrud::new(self.app_state.db.clone());
        let current_user_id = &self.app_state.user.clone().unwrap().id;

        for (issue_id, new_priority) in issue_priorities {
            let issue = issue::Entity::find_by_id(issue_id)
                .one(&self.app_state.db)
                .await?
                .ok_or(DbErr::Custom("Issue not found".to_owned()))?;

            let current_version = issue.lock_version;
            let old_priority = issue.priority;
            let mut issue: issue::ActiveModel = issue.into();

            issue.priority = Set(new_priority);
            issue.lock_version = Set(current_version + 1);

            let updated_issue = issue.update(&self.app_state.db).await?;

            // Add history record for priority update
            let history_record =
                format!("Updated priority from {} to {}", old_priority, new_priority);
            history_crud
                .create(*current_user_id, Some(issue_id), None, None, history_record)
                .await?;

            updated_issues.push(updated_issue);
        }

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!(updated_issues),
        );

        Ok(updated_issues)
    }

    pub async fn calculate_weekly_points_average(&self, project_id: i32) -> Result<f64, DbErr> {
        let now = chrono::Utc::now().date_naive();
        let mut total_points = 0;
        let mut weeks_with_data = 0;
        let target_weeks = 3i64; // Number of weeks to consider, explicitly as i64

        // Find the earliest accepted issue to determine how long the project has been active
        let earliest_issue = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(project_id))
            .filter(issue::Column::Status.eq(STATUS_ACCEPTED))
            .order_by(issue::Column::AcceptedAt, Order::Asc)
            .one(&self.app_state.db)
            .await?;

        // Calculate how many weeks the project has been active
        let weeks_active = if let Some(issue) = &earliest_issue {
            let earliest_date = if let Some(accepted_at) = issue.accepted_at {
                accepted_at.date_naive()
            } else {
                issue.created_at.date_naive()
            };

            let days_diff = (now - earliest_date).num_days();
            (days_diff as f64 / 7.0).ceil() as i64 // Convert to i64
        } else {
            0i64 // No accepted issues yet, explicitly as i64
        };

        // Get the start of the current week (Monday)
        let days_from_monday = now.weekday().num_days_from_monday();
        let current_week_monday = now - chrono::Duration::days(days_from_monday as i64);

        // Collect actual data for the 3 weeks preceding the current week
        for week_offset in 1..=target_weeks {
            // Start from 1 to skip current week
            let monday_of_week = current_week_monday - chrono::Duration::weeks(week_offset);
            let sunday_of_week = monday_of_week + chrono::Duration::days(6); // End of the week (Sunday)

            let issues = issue::Entity::find()
                .filter(issue::Column::ProjectId.eq(project_id))
                .filter(issue::Column::Points.is_not_null())
                .filter(issue::Column::Status.eq(STATUS_ACCEPTED))
                .filter(
                    Condition::all()
                        .add(issue::Column::AcceptedAt.is_not_null())
                        .add(issue::Column::AcceptedAt.gte(monday_of_week))
                        .add(issue::Column::AcceptedAt.lte(sunday_of_week)),
                )
                .all(&self.app_state.db)
                .await?;

            if !issues.is_empty() {
                let weekly_points: i32 = issues.iter().filter_map(|issue| issue.points).sum();
                total_points += weekly_points;
                weeks_with_data += 1;
            }
        }

        // Calculate the average based on actual data
        let actual_average = if weeks_with_data > 0 {
            total_points as f64 / weeks_with_data as f64
        } else {
            10.0 // Default if no weeks have data
        };

        // If the project has been active for less than 3 weeks, blend with assumed 10 points per week
        let average = if weeks_active < target_weeks && weeks_with_data > 0 {
            // Calculate how many weeks to fill with the default value
            let weeks_to_fill = target_weeks - weeks_active;

            // Blend actual data with assumed data (10 points per missing week)
            (total_points as f64 + (weeks_to_fill as f64 * 10.0))
                / (weeks_with_data as f64 + weeks_to_fill as f64)
        } else {
            actual_average
        };

        Ok(average)
    }
}
