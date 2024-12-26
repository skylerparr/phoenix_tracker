use sea_orm::*;

#[derive(Clone, Debug)]
pub struct IssueAssigneeCrud {
    db: DatabaseConnection,
}

impl IssueAssigneeCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(&self, issue_id: i32, user_id: i32) -> Result<issue_assignee::Model, DbErr> {
        let issue_assignee = issue_assignee::ActiveModel {
            issue_id: Set(issue_id),
            user_id: Set(user_id),
            ..Default::default()
        };
        
        issue_assignee.insert(&self.db).await
    }

    pub async fn find_by_ids(&self, issue_id: i32, user_id: i32) -> Result<Option<issue_assignee::Model>, DbErr> {
        issue_assignee::Entity::find()
            .filter(issue_assignee::Column::IssueId.eq(issue_id))
            .filter(issue_assignee::Column::UserId.eq(user_id))
            .one(&self.db)
            .await
    }

    pub async fn find_by_issue_id(&self, issue_id: i32) -> Result<Vec<issue_assignee::Model>, DbErr> {
        issue_assignee::Entity::find()
            .filter(issue_assignee::Column::IssueId.eq(issue_id))
            .all(&self.db)
            .await
    }

    pub async fn find_by_user_id(&self, user_id: i32) -> Result<Vec<issue_assignee::Model>, DbErr> {
        issue_assignee::Entity::find()
            .filter(issue_assignee::Column::UserId.eq(user_id))
            .all(&self.db)
            .await
    }

    pub async fn delete(&self, issue_id: i32, user_id: i32) -> Result<DeleteResult, DbErr> {
        issue_assignee::Entity::delete_many()
            .filter(issue_assignee::Column::IssueId.eq(issue_id))
            .filter(issue_assignee::Column::UserId.eq(user_id))
            .exec(&self.db)
            .await
    }
}
