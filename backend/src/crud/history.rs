use crate::entities::history;
use sea_orm::prelude::Expr;
use sea_orm::*;

#[derive(Clone, Debug)]
pub struct HistoryCrud {
    db: DatabaseConnection,
}

impl HistoryCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        user_id: i32,
        issue_id: Option<i32>,
        comment_id: Option<i32>,
        task_id: Option<i32>,
        action: String,
    ) -> Result<history::Model, DbErr> {
        let history = history::ActiveModel {
            user_id: Set(user_id),
            issue_id: Set(issue_id),
            comment_id: Set(comment_id),
            task_id: Set(task_id),
            action: Set(action),
            ..Default::default()
        };

        history.insert(&self.db).await
    }

    pub async fn create_with_txn<'db, C>(
        &self,
        user_id: i32,
        issue_id: Option<i32>,
        comment_id: Option<i32>,
        task_id: Option<i32>,
        action: String,
        txn: &C,
    ) -> Result<history::Model, DbErr>
    where
        C: sea_orm::ConnectionTrait,
    {
        let history = history::ActiveModel {
            user_id: Set(user_id),
            issue_id: Set(issue_id),
            comment_id: Set(comment_id),
            task_id: Set(task_id),
            action: Set(action),
            ..Default::default()
        };

        history.insert(txn).await
    }

    pub async fn find_by_issue_id(&self, issue_id: i32) -> Result<Vec<history::Model>, DbErr> {
        history::Entity::find()
            .filter(history::Column::IssueId.eq(issue_id))
            .order_by_desc(history::Column::CreatedAt)
            .all(&self.db)
            .await
    }

    pub async fn delete_by_issue_id(&self, issue_id: i32) -> Result<DeleteResult, DbErr> {
        history::Entity::delete_many()
            .filter(history::Column::IssueId.eq(issue_id))
            .exec(&self.db)
            .await
    }

    pub async fn delete_by_comment_id(&self, comment_id: i32) -> Result<UpdateResult, DbErr> {
        history::Entity::update_many()
            .col_expr(history::Column::CommentId, Expr::value(Value::Int(None)))
            .filter(history::Column::CommentId.eq(comment_id))
            .exec(&self.db)
            .await
    }
}
