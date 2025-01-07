use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::entities::blocker;
use crate::AppState;
use sea_orm::*;

#[derive(Clone)]
pub struct BlockerCrud {
    app_state: AppState,
}

impl BlockerCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    pub async fn create(&self, blocker_id: i32, blocked_id: i32) -> Result<blocker::Model, DbErr> {
        let model = self.find_by_ids(blocker_id, blocked_id).await?;
        if let Some(model) = model {
            return Ok(model);
        }
        let blocker = blocker::ActiveModel {
            blocker_id: Set(blocker_id),
            blocked_id: Set(blocked_id),
        };

        let result = blocker.insert(&self.app_state.db).await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({ "id": blocker_id }),
        );

        Ok(result)
    }

    pub async fn find_by_ids(
        &self,
        blocker_id: i32,
        blocked_id: i32,
    ) -> Result<Option<blocker::Model>, DbErr> {
        blocker::Entity::find()
            .filter(blocker::Column::BlockerId.eq(blocker_id))
            .filter(blocker::Column::BlockedId.eq(blocked_id))
            .one(&self.app_state.db)
            .await
    }

    pub async fn find_by_blocker_id(&self, blocker_id: i32) -> Result<Vec<blocker::Model>, DbErr> {
        blocker::Entity::find()
            .filter(blocker::Column::BlockerId.eq(blocker_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn find_by_blocked_id(&self, blocked_id: i32) -> Result<Vec<blocker::Model>, DbErr> {
        blocker::Entity::find()
            .filter(blocker::Column::BlockedId.eq(blocked_id))
            .all(&self.app_state.db)
            .await
    }

    pub async fn delete(&self, blocker_id: i32, blocked_id: i32) -> Result<DeleteResult, DbErr> {
        let result = blocker::Entity::delete_many()
            .filter(blocker::Column::BlockerId.eq(blocker_id))
            .filter(blocker::Column::BlockedId.eq(blocked_id))
            .exec(&self.app_state.db)
            .await?;

        let project_id = &self.app_state.project.clone().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
        broadcaster.broadcast_event(
            *project_id,
            ISSUE_UPDATED,
            serde_json::json!({ "id": blocker_id }),
        );

        Ok(result)
    }

    pub async fn delete_all_by_blocker_id(&self, blocker_id: i32) -> Result<DeleteResult, DbErr> {
        blocker::Entity::delete_many()
            .filter(blocker::Column::BlockerId.eq(blocker_id))
            .exec(&self.app_state.db)
            .await
    }

    pub async fn delete_all_by_blocked_id(&self, blocked_id: i32) -> Result<DeleteResult, DbErr> {
        blocker::Entity::delete_many()
            .filter(blocker::Column::BlockedId.eq(blocked_id))
            .exec(&self.app_state.db)
            .await
    }

    pub async fn delete_all_by_issue_id(&self, issue_id: i32) -> Result<DeleteResult, DbErr> {
        let result = blocker::Entity::delete_many()
            .filter(
                Condition::any()
                    .add(blocker::Column::BlockerId.eq(issue_id))
                    .add(blocker::Column::BlockedId.eq(issue_id)),
            )
            .exec(&self.app_state.db)
            .await?;

        Ok(result)
    }
}
