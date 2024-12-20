use sea_orm::*;

#[derive(Clone, Debug)]
pub struct IssueCrud {
    db: DatabaseConnection,
}

impl IssueCrud {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        title: String,
        description: Option<String>,
        priority: i32,
        status: String,
        project_id: i32,
        created_by_id: i32,
    ) -> Result<issue::Model, DbErr> {
        let issue = issue::ActiveModel {
            title: Set(title),
            description: Set(description),
            priority: Set(priority),
            status: Set(status),
            project_id: Set(project_id),
            created_by_id: Set(created_by_id),
            ..Default::default()
        };
        
        issue.insert(&self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<issue::Model>, DbErr> {
        issue::Entity::find_by_id(id)
            .one(&self.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<issue::Model>, DbErr> {
        issue::Entity::find()
            .all(&self.db)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        title: Option<String>,
        description: Option<Option<String>>,
        priority: Option<i32>,
        status: Option<String>,
        project_id: Option<i32>,
    ) -> Result<issue::Model, DbErr> {
        let issue = issue::Entity::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(DbErr::Custom("Issue not found".to_owned()))?;

        let mut issue: issue::ActiveModel = issue.into();

        if let Some(title) = title {
            issue.title = Set(title);
        }

        if let Some(description) = description {
            issue.description = Set(description);
        }

        if let Some(priority) = priority {
            issue.priority = Set(priority);
        }

        if let Some(status) = status {
            issue.status = Set(status);
        }

        if let Some(project_id) = project_id {
            issue.project_id = Set(project_id);
        }

        issue.update(&self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<DeleteResult, DbErr> {
        issue::Entity::delete_by_id(id)
            .exec(&self.db)
            .await
    }
}
