use crate::crud::token::TokenCrud;
use crate::AppState;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    response::IntoResponse,
};
use tokio::sync::broadcast;
use tracing::debug;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));

    match auth_header {
        Some(token) => {
            let token_crud = TokenCrud::new(state.db.clone());
            let now = chrono::Utc::now();
            let rx = state.tx.subscribe();

            match token_crud
                .find_valid_token(token.to_string(), now.into())
                .await
            {
                Ok(Some(_)) => {
                    debug!("WebSocket connection upgraded");
                    ws.on_upgrade(move |socket| handle_socket(socket, rx))
                }
                _ => StatusCode::UNAUTHORIZED.into_response(),
            }
        }
        None => StatusCode::UNAUTHORIZED.into_response(),
    }
}
pub async fn handle_socket(mut socket: WebSocket, rx: broadcast::Receiver<String>) {
    let mut rx = rx;

    loop {
        tokio::select! {
            msg = socket.recv() => {
                if let Some(Ok(msg)) = msg {
                    debug!("Received message: {:?}", msg);
                    match msg {
                        Message::Text(text) => {
                            if socket.send(Message::Text(text)).await.is_err() {
                                break;
                            }
                        }
                        Message::Close(_) => break,
                        _ => {}
                    }
                }
            }
            Ok(msg) = rx.recv() => {
                if socket.send(Message::Text(msg)).await.is_err() {
                    break;
                }
            }
        }
    }
}
