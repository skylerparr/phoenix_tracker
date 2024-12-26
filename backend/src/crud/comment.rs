use sea_orm::*;

#[derive(Clone, Debug)]
pub struct CommentCrud {
    db: DatabaseConnection,
}

impl CommentCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        content: String,
        issue_id: i32,
        user_id: i32,
    ) -> Result<comment::Model, DbErr> {
        let comment = comment::ActiveModel {
            content: Set(content),
            issue_id: Set(issue_id),
            user_id: Set(user_id),
            ..Default::default()
        };
        
        comment.insert(&self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<comment::Model>, DbErr> {
        comment::Entity::find_by_id(id)
            .one(&self.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<comment::Model>, DbErr> {
        comment::Entity::find()
            .all(&self.db)
            .await
    }

    pub async fn find_by_issue_id(&self, issue_id: i32) -> Result<Vec<comment::Model>, DbErr> {
        comment::Entity::find()
            .filter(comment::Column::IssueId.eq(issue_id))
            .all(&self.db)
            .await
    }

    pub async fn find_by_user_id(&self, user_id: i32) -> Result<Vec<comment::Model>, DbErr> {
        comment::Entity::find()
            .filter(comment::Column::UserId.eq(user_id))
            .all(&self.db)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        content: Option<String>,
    ) -> Result<comment::Model, DbErr> {
        let comment = comment::Entity::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(DbErr::Custom("Comment not found".to_owned()))?;

        let mut comment: comment::ActiveModel = comment.into();

        if let Some(content) = content {
            comment.content = Set(content);
        }

        comment.update(&self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        comment::Entity::delete_by_id(id)
            .exec(&self.db)
            .await
    }
}
