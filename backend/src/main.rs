use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    http::{HeaderName, HeaderValue, Method},
    response::IntoResponse,
    routing::get,
    Router,
};
use sea_orm::{Database, DatabaseConnection};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
mod crud;
mod endpoints;
mod entities;
use endpoints::{
    comment::comment_routes, issue::issue_routes, owner::owner_routes, project::project_routes,
    user::user_routes,
};

fn create_router(db: DatabaseConnection) -> Router {
    Router::new()
        .merge(user_routes())
        .merge(issue_routes())
        .merge(comment_routes())
        .merge(owner_routes())
        .merge(project_routes())
        .with_state(db)
}

fn main() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let database_url = "sqlite:data/app.db";
        let conn = Database::connect(database_url).await.unwrap();

        let cors = CorsLayer::new()
            .allow_origin(HeaderValue::from_static("http://localhost:3000"))
            .allow_methods(vec![Method::GET, Method::POST])
            .allow_headers(vec![
                HeaderName::from_static("content-type"),
                HeaderName::from_static("upgrade"),
                HeaderName::from_static("connection"),
            ])
            .allow_credentials(true);

        let app = create_router(conn)
            .route("/ws", get(ws_handler))
            .route("/", get(|| async { "Tracker Root" }))
            .layer(cors);

        let port = std::env::var("PORT")
            .unwrap_or_else(|_| "3001".to_string())
            .parse::<u16>()
            .unwrap();
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        println!("Listening on {}", addr);
        let listener = TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    });
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    println!("WebSocket connection upgraded");
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    while let Some(msg) = socket.recv().await {
        if let Ok(msg) = msg {
            println!("Received message: {:?}", msg);
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
