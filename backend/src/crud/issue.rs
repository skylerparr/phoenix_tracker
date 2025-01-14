use crate::crud::blocker::BlockerCrud;
use crate::crud::comment::CommentCrud;
use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::{ISSUE_CREATED, ISSUE_DELETED, ISSUE_UPDATED};
use crate::crud::issue_assignee::IssueAssigneeCrud;
use crate::crud::issue_tag::IssueTagCrud;
use crate::crud::status::{STATUS_ACCEPTED, STATUS_REJECTED, STATUS_UNSTARTED};
use crate::crud::task::TaskCrud;
use crate::entities::issue;
use crate::entities::issue_assignee;
use crate::entities::issue_tag;
use crate::AppState;
use chrono::Datelike;
use sea_orm::entity::prelude::*;
use sea_orm::*;
use tracing::debug;

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
        let mut issue = issue.insert(&self.app_state.db).await?;
        self.populate_issue_tags(&mut issue).await?;
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
        }
        Ok(issue)
    }

    pub async fn find_all_for_backlog(
        &self,
        project_id: i32,
        is_icebox: bool,
    ) -> Result<Vec<issue::Model>, DbErr> {
        let now = chrono::Utc::now().date_naive();
        let days_from_monday = now.weekday().num_days_from_monday();
        let monday = now - chrono::Duration::days(days_from_monday as i64);

        let mut issues = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(project_id))
            .filter(issue::Column::IsIcebox.eq(is_icebox))
            .filter(
                Condition::any()
                    .add(issue::Column::Status.ne(STATUS_ACCEPTED))
                    .add(
                        Condition::all()
                            .add(issue::Column::Status.eq(STATUS_ACCEPTED))
                            .add(issue::Column::UpdatedAt.gte(monday)),
                    ),
            )
            .order_by(issue::Column::Priority, Order::Asc)
            .all(&self.app_state.db)
            .await?;

        for issue in &mut issues {
            self.populate_issue_tags(issue).await?;
        }
        Ok(self.schedule_issues(issues).await?)
    }

    async fn schedule_issues(&self, issues: Vec<issue::Model>) -> Result<Vec<issue::Model>, DbErr> {
        let mut scheduled_issues = issues;
        let project_id = &self.app_state.project.clone().unwrap().id;
        let weekly_average = self.calculate_weekly_points_average(*project_id).await?;

        let now = chrono::Utc::now();
        let days_from_monday = now.weekday().num_days_from_monday();
        let mut current_monday = now.date_naive() - chrono::Duration::days(days_from_monday as i64);

        let mut current_week_points = 0;

        for issue in &mut scheduled_issues {
            let issue_points = issue.points.unwrap_or(0);

            if issue.status != STATUS_UNSTARTED && issue.status != STATUS_REJECTED {
                if chrono::Utc::now().weekday() == chrono::Weekday::Sun {
                    current_monday = current_monday - chrono::Duration::days(7);
                }

                issue.scheduled_at = Some(
                    current_monday
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
        }
        Ok(issues)
    }

    pub async fn find_all_by_user_id(&self, user_id: i32) -> Result<Vec<issue::Model>, DbErr> {
        let now = chrono::Utc::now().date_naive();
        let days_from_monday = now.weekday().num_days_from_monday();
        let monday = now - chrono::Duration::days(days_from_monday as i64);

        let mut issues = issue_assignee::Entity::find()
            .filter(issue_assignee::Column::UserId.eq(user_id))
            .find_also_related(issue::Entity)
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
            if is_icebox {
                issue.status = Set(STATUS_UNSTARTED);
            }
        }

        issue.project_id = Set(project_id);
        issue.lock_version = Set(current_version + 1);

        let mut result = issue.clone().update(&txn).await?;
        if result.lock_version != current_version + 1 {
            txn.rollback().await?;
            return Err(DbErr::Custom("Optimistic lock error".to_owned()));
        }

        txn.commit().await?;

        let current_user_id = &self.app_state.user.clone().unwrap().id;
        let issue_assignee_crud = IssueAssigneeCrud::new(self.app_state.clone());
        issue_assignee_crud
            .create(issue.id.clone().unwrap(), *current_user_id)
            .await?;

        self.populate_issue_tags(&mut result).await?;
        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(*project_id, ISSUE_UPDATED, serde_json::json!(result));

        Ok(result)
    }
    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
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
        let txn = self.app_state.db.begin().await?;

        for (issue_id, new_priority) in issue_priorities {
            let issue = issue::Entity::find_by_id(issue_id)
                .one(&txn)
                .await?
                .ok_or(DbErr::Custom("Issue not found".to_owned()))?;

            let current_version = issue.lock_version;
            let mut issue: issue::ActiveModel = issue.into();

            issue.priority = Set(new_priority);
            issue.lock_version = Set(current_version + 1);

            let updated_issue = issue.update(&txn).await?;
            updated_issues.push(updated_issue);
        }

        txn.commit().await?;

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

        for week_offset in 0..3 {
            let days_from_monday = (now - chrono::Duration::weeks(week_offset))
                .weekday()
                .num_days_from_monday();
            let monday = now
                - chrono::Duration::days(days_from_monday as i64)
                - chrono::Duration::weeks(week_offset);

            let issues = issue::Entity::find()
                .filter(issue::Column::ProjectId.eq(project_id))
                .filter(issue::Column::Points.is_not_null())
                .filter(issue::Column::UpdatedAt.gte(monday))
                .filter(issue::Column::Status.eq(STATUS_ACCEPTED))
                .filter(issue::Column::UpdatedAt.lt(monday + chrono::Duration::days(7)))
                .all(&self.app_state.db)
                .await?;

            if !issues.is_empty() {
                let weekly_points: i32 = issues.iter().filter_map(|issue| issue.points).sum();
                total_points += weekly_points;
                weeks_with_data += 1;
            }
        }

        let average = if weeks_with_data > 0 {
            total_points as f64 / weeks_with_data as f64
        } else {
            10.0
        };

        Ok(average)
    }
    pub async fn get_backlog(&self, project_id: i32) -> Result<Vec<issue::Model>, DbErr> {
        let issues = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(project_id))
            .filter(issue::Column::Status.ne(STATUS_ACCEPTED))
            .order_by(issue::Column::Priority, Order::Asc)
            .all(&self.app_state.db)
            .await?;

        Ok(issues)
    }

    pub async fn get_accepted_issues(&self, project_id: i32) -> Result<Vec<issue::Model>, DbErr> {
        let now = chrono::Utc::now().date_naive();
        let days_from_monday = now.weekday().num_days_from_monday();
        let monday = now - chrono::Duration::days(days_from_monday as i64);

        let issues = issue::Entity::find()
            .filter(issue::Column::ProjectId.eq(project_id))
            .filter(issue::Column::UpdatedAt.gte(monday))
            .filter(issue::Column::Status.eq(STATUS_ACCEPTED))
            .all(&self.app_state.db)
            .await?;

        Ok(issues)
    }
}
