use crate::crud::project::ProjectCrud;
use crate::crud::token::TokenCrud;
use crate::AppState;
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

struct WebSocketState {
    subscribed_projects: HashSet<i32>,
    user_id: i32,
}

#[derive(serde::Deserialize, Debug)]
struct SocketCommandWrapper {
    command: String,
    #[serde(rename = "projectId")]
    project_id: i32,
}

#[derive(Debug)]
enum SocketCommand {
    Subscribe { project_id: i32 },
    Unsubscribe { project_id: i32 },
}

#[derive(serde::Deserialize, Debug)]
struct ProjectEvent {
    project_id: i32,
    #[serde(flatten)]
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
            let token_crud = TokenCrud::new(state.db.clone());
            let now = chrono::Utc::now();
            let rx = state.tx.subscribe();

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
                                    "subscribe" => Some(SocketCommand::Subscribe {
                                        project_id: wrapper.project_id
                                    }),
                                    "unsubscribe" => Some(SocketCommand::Unsubscribe {
                                        project_id: wrapper.project_id
                                    }),
                                    _ => None,
                                };

                                debug!("Received command: {:?}", command);
                                if let Some(cmd) = command {
                                    match cmd {
                                        SocketCommand::Subscribe { project_id } => {
                                            let project_crud = ProjectCrud::new(state.db.clone());
                                            if let Ok(project_users) = project_crud.find_users_by_project_id(project_id).await {
                                                if project_users.iter().any(|pu| pu.user_id == user_id) {
                                                    let mut ws_state = web_socket_state.lock().await;
                                                    ws_state.subscribed_projects.insert(project_id);
                                                    debug!("Subscribed to project {}", project_id);
                                                    let _ = socket.send(Message::Text(format!("Subscribed to project {}", project_id))).await;
                                                }
                                            } else {
                                                debug!("Failed to find project users for project {}", project_id);
                                            }
                                        },
                                        SocketCommand::Unsubscribe { project_id } => {
                                            let mut ws_state = web_socket_state.lock().await;
                                            ws_state.subscribed_projects.remove(&project_id);
                                            debug!("Unsubscribed from project {}", project_id);
                                            let _ = socket.send(Message::Text(format!("Unsubscribed from project {}", project_id))).await;
                                        }
                                    }
                                }
                            }
                        }
                        Message::Close(_) => break,
                        _ => {}
                    }
                }
            }
            Ok(msg) = rx.recv() => {
                debug!("Received broadcast message: {}", msg);
                if let Ok(event) = serde_json::from_str::<ProjectEvent>(&msg) {
                    let ws_state = web_socket_state.lock().await;
                    if ws_state.subscribed_projects.contains(&event.project_id) {
                        if socket.send(Message::Text(msg)).await.is_err() {
                            break;
                        }
                    }
                }
            }
        }
    }
}
