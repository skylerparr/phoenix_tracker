use sea_orm::*;

#[derive(Clone, Debug)]
pub struct IssueTagCrud {
    db: DatabaseConnection,
}

impl IssueTagCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(&self, issue_id: i32, tag_id: i32) -> Result<issue_tag::Model, DbErr> {
        let issue_tag = issue_tag::ActiveModel {
            issue_id: Set(issue_id),
            tag_id: Set(tag_id),
            ..Default::default()
        };
        
        issue_tag.insert(&self.db).await
    }

    pub async fn find_by_ids(&self, issue_id: i32, tag_id: i32) -> Result<Option<issue_tag::Model>, DbErr> {
        issue_tag::Entity::find()
            .filter(issue_tag::Column::IssueId.eq(issue_id))
            .filter(issue_tag::Column::TagId.eq(tag_id))
            .one(&self.db)
            .await
    }

    pub async fn find_by_issue_id(&self, issue_id: i32) -> Result<Vec<issue_tag::Model>, DbErr> {
        issue_tag::Entity::find()
            .filter(issue_tag::Column::IssueId.eq(issue_id))
            .all(&self.db)
            .await
    }

    pub async fn find_by_tag_id(&self, tag_id: i32) -> Result<Vec<issue_tag::Model>, DbErr> {
        issue_tag::Entity::find()
            .filter(issue_tag::Column::TagId.eq(tag_id))
            .all(&self.db)
            .await
    }

    pub async fn delete(&self, issue_id: i32, tag_id: i32) -> Result<DeleteResult, DbErr> {
        issue_tag::Entity::delete_many()
            .filter(issue_tag::Column::IssueId.eq(issue_id))
            .filter(issue_tag::Column::TagId.eq(tag_id))
            .exec(&self.db)
            .await
    }
}
