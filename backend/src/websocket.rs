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
    last_ping_time: std::time::Instant,
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

// Maximum time allowed between pings (in seconds)
const MAX_PING_INTERVAL_SECS: u64 = 120;

pub async fn handle_socket(
    mut socket: WebSocket,
    mut rx: broadcast::Receiver<String>,
    state: AppState,
    user_id: i32,
) {
    // Initialize the WebSocket state with the current time
    let web_socket_state = Arc::new(Mutex::new(WebSocketState {
        subscribed_projects: HashSet::new(),
        user_id,
        last_ping_time: std::time::Instant::now(),
    }));

    let user_setting_crud = UserSettingCrud::new(state.db.clone());

    // Create a ticker to check for stale connections periodically
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));

    loop {
        tokio::select! {
            // Check for stale connections periodically
            _ = interval.tick() => {
                // Check if the connection is stale
                let is_stale = {
                    let ws_state = web_socket_state.lock().await;
                    let elapsed = ws_state.last_ping_time.elapsed().as_secs();
                    elapsed > MAX_PING_INTERVAL_SECS
                };

                // If the connection is stale, close it
                if is_stale {
                    debug!("WebSocket connection for user {} is stale (no ping in {} seconds), closing",
                           user_id, MAX_PING_INTERVAL_SECS);
                    break;
                }
            }

            // Handle incoming WebSocket messages
            Some(msg_result) = socket.recv() => {
                match msg_result {
                    Ok(msg) => {
                        match msg {
                            Message::Text(text) => {
                                debug!("Received message: {}", text);

                                // Handle ping messages
                                if text == "ping" {
                                    debug!("Received ping, updating last_ping_time");
                                    {
                                        let mut ws_state = web_socket_state.lock().await;
                                        ws_state.last_ping_time = std::time::Instant::now();
                                    }
                                    if let Err(_) = socket.send(Message::Text("pong".to_string())).await {
                                        break;
                                    }
                                    continue;
                                }

                                // Handle regular commands
                                if let Ok(wrapper) = serde_json::from_str::<SocketCommandWrapper>(&text) {
                                    // Update last ping time on any valid command
                                    {
                                        let mut ws_state = web_socket_state.lock().await;
                                        ws_state.last_ping_time = std::time::Instant::now();
                                    }

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
                                                                let response = format!("{{\"event\": \"subscribed\", \"project_id\": {}}}", project_id);
                                                                if let Err(_) = socket.send(Message::Text(response)).await {
                                                                    break;
                                                                }
                                                            }
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
                                                        let response = format!("{{\"event\": \"unsubscribed\", \"project_id\": {}}}", project_id);
                                                        if let Err(_) = socket.send(Message::Text(response)).await {
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            Message::Close(_) => {
                                debug!("WebSocket closed, clearing all subscriptions");
                                break;
                            },
                            _ => {}
                        }
                    },
                    Err(e) => {
                        debug!("WebSocket error: {:?}", e);
                        break;
                    }
                }
            }

            // Handle broadcast messages from other parts of the application
            Ok(broadcast_msg) = rx.recv() => {
                if let Ok(event) = serde_json::from_str::<ProjectEvent>(&broadcast_msg) {
                    let ws_state = web_socket_state.lock().await;
                    if ws_state.subscribed_projects.contains(&event.project_id) {
                        if let Err(_) = socket.send(Message::Text(broadcast_msg)).await {
                            break;
                        }
                    }
                }
            }
        }
    }

    // Clean up any resources when WebSocket closes
    debug!("WebSocket connection closed for user {}", user_id);

    // Clear all subscriptions
    if let Ok(mut ws_state) = web_socket_state.try_lock() {
        ws_state.subscribed_projects.clear();
    };
}
