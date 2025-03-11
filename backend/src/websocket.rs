use crate::crud::project::ProjectCrud;
use crate::crud::token::TokenCrud;
use crate::AppState;
use crate::UserSettingCrud;
use axum::extract::Query;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::StatusCode,
    response::IntoResponse,
};
use std::collections::HashMap;
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::sync::Mutex;
use tracing::debug;

#[allow(dead_code)]
struct WebSocketState {
    subscribed_projects: HashSet<i32>,
    user_id: i32,
}

#[derive(serde::Deserialize, Debug)]
struct SocketCommandWrapper {
    command: String,
}

#[derive(Debug)]
enum SocketCommand {
    Subscribe {},
    Unsubscribe {},
}

#[allow(dead_code)]
#[derive(serde::Deserialize, Debug)]
struct ProjectEvent {
    project_id: i32,
    event_type: String,
    data: serde_json::Value,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let token = params.get("token");

    match token {
        Some(token) => {
            debug!("token = {}", token);
            let now = chrono::Utc::now();
            let rx = state.tx.subscribe();
            let token_crud = TokenCrud::new(state.db.clone());

            match token_crud
                .find_valid_token(token.to_string(), now.into())
                .await
            {
                Ok(Some(token)) => {
                    debug!("WebSocket connection upgraded");
                    ws.on_upgrade(move |socket| handle_socket(socket, rx, state, token.user_id))
                }
                _ => StatusCode::UNAUTHORIZED.into_response(),
            }
        }
        None => StatusCode::UNAUTHORIZED.into_response(),
    }
}
pub async fn handle_socket(
    mut socket: WebSocket,
    rx: broadcast::Receiver<String>,
    state: AppState,
    user_id: i32,
) {
    let mut rx = rx;
    let web_socket_state = Arc::new(Mutex::new(WebSocketState {
        subscribed_projects: HashSet::new(),
        user_id,
    }));

    let user_setting_crud = UserSettingCrud::new(state.db.clone());

    loop {
        tokio::select! {
            msg = socket.recv() => {
                if let Some(Ok(msg)) = msg {
                    debug!("Received message: {:?}", msg);
                    match msg {
                        Message::Text(text) => {
                            debug!("Received message: {}", text);
                            if let Ok(wrapper) = serde_json::from_str::<SocketCommandWrapper>(&text) {
                                let command = match wrapper.command.as_str() {
                                    "subscribe" => Some(SocketCommand::Subscribe {}),
                                    "unsubscribe" => Some(SocketCommand::Unsubscribe {}),
                                    _ => None,
                                };

                                debug!("Received command: {:?}", command);
                                if let Some(cmd) = command {
                                    match cmd {
                                        SocketCommand::Subscribe { .. } => {
                                            if let Ok(user_setting) = user_setting_crud.find_by_user_id(user_id).await {
                                                if let Some(project_id) = user_setting.project_id {
                                                    let project_crud = ProjectCrud::new(state.clone());
                                                    if let Ok(project_users) = project_crud.find_users_by_project_id(project_id).await {
                                                        if project_users.iter().any(|pu| pu.user_id == user_id) {
                                                            let mut ws_state = web_socket_state.lock().await;
                                                            ws_state.subscribed_projects.insert(project_id);
                                                            debug!("Subscribed to project {}", project_id);
                                                            let _ = socket.send(Message::Text(format!("{{\"event\": \"subscribed\", \"project_id\": {}}}", project_id))).await;                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        SocketCommand::Unsubscribe { .. } => {
                                            if let Ok(user_setting) = user_setting_crud.find_by_user_id(user_id).await {
                                                if let Some(project_id) = user_setting.project_id {
                                                    let mut ws_state = web_socket_state.lock().await;
                                                    ws_state.subscribed_projects.remove(&project_id);
                                                    debug!("Unsubscribed from project {}", project_id);
                                                    let _ = socket.send(Message::Text(format!("{{\"event\": \"unsubscribed\", \"project_id\": {}}}", project_id))).await;                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Message::Close(_) => {
                            debug!("WebSocket closed, clearing all subscriptions");
                            // Acquire lock on web_socket_state
                            if let Ok(mut ws_state) = web_socket_state.try_lock() {
                                // Get all subscribed project IDs before clearing
                                let project_ids: Vec<i32> = ws_state.subscribed_projects.iter().copied().collect();

                                // Clear all subscriptions
                                ws_state.subscribed_projects.clear();

                                // Log which projects were unsubscribed
                                for project_id in project_ids {
                                    debug!("Unsubscribed user {} from project {} due to WebSocket closure",
                                           ws_state.user_id, project_id);
                                }

                                debug!("Successfully cleared all subscriptions for user {}", ws_state.user_id);
                            } else {
                                debug!("Could not acquire lock to clear subscriptions on WebSocket close");
                            }
                            break;
                        },
                        _ => {}
                    }
                }
            }
            Ok(msg) = rx.recv() => {
                debug!("Received broadcast message: {}", msg);
                if let Ok(event) = serde_json::from_str::<ProjectEvent>(&msg) {
                    debug!("Acquiring web_socket_state lock");
                    let ws_state = web_socket_state.lock().await;
                    debug!("Checking if project {} is in subscribed projects", event.project_id);
                    if ws_state.subscribed_projects.contains(&event.project_id) {
                        debug!("Sending message to socket");
                        if socket.send(Message::Text(msg)).await.is_err() {
                            debug!("Failed to send message, breaking");
                            break;
                        }
                    }
                } else {
                    debug!("Failed to deserialize message {}", msg);
                }
            }
        }
    }
}
