use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    routing::{get, get_service},
    Router,
};
use std::net::SocketAddr;
use tower_http::services::ServeDir;
use tokio::net::TcpListener;

fn main() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let app = Router::new()
            .route("/ws", get(ws_handler))
            .route("/", get(|| async { "Hello, World!" }));
        let port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string()).parse::<u16>().unwrap();
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        println!("Listening on {}", addr);
        let listener = TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    });
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    while let Some(msg) = socket.recv().await {
        if let Ok(msg) = msg {
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
}
