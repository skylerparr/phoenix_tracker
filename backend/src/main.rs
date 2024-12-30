use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    http::{HeaderName, HeaderValue, Method},
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
use crate::crud::token::TokenCrud;
use axum::body::Body;
use axum::extract::Request;
use axum::extract::State;
use axum::http::header::AUTHORIZATION;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::response::Response;
use endpoints::{
    auth::auth_routes, comment::comment_routes, issue::issue_routes, owner::owner_routes,
    project::project_routes, user::user_routes,
};
use futures::future::BoxFuture;
use tower_service::Service;
use tracing::{debug, error, info, warn};
#[derive(Clone)]
struct AuthMiddleware<S> {
    inner: S,
    db: DatabaseConnection,
}

impl<S> Service<Request<Body>> for AuthMiddleware<S>
where
    S: Service<Request<Body>, Response = Response<Body>> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = Response<Body>;
    type Error = S::Error;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(
        &mut self,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let mut inner = self.inner.clone();
        let db = self.db.clone();

        Box::pin(async move {
            if req.uri().path().starts_with("/auth") {
                info!("Skipping auth middleware for /auth route");
                return inner.call(req).await;
            }

            let auth_header = req
                .headers()
                .get(AUTHORIZATION)
                .and_then(|value| value.to_str().ok());

            match auth_header {
                Some(token) => {
                    let token_crud = TokenCrud::new(db);
                    let now = chrono::Utc::now();

                    match token_crud
                        .find_valid_token(token.to_string(), now.into())
                        .await
                    {
                        Ok(Some(_)) => {
                            debug!("Valid token found, proceeding with request");
                            inner.call(req).await
                        }
                        _ => {
                            warn!("Invalid or expired token provided");
                            debug!("Token validation failed - checking token details");
                            debug!("Found token: {:?}", token);
                            Ok(Response::builder()
                                .status(StatusCode::UNAUTHORIZED)
                                .body(Body::empty())
                                .unwrap())
                        }
                    }
                }
                None => {
                    warn!("No authorization token provided");
                    Ok(Response::builder()
                        .status(StatusCode::UNAUTHORIZED)
                        .body(Body::empty())
                        .unwrap())
                }
            }
        })
    }
}
fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let database_url = "sqlite:data/app.db";
        let conn = Database::connect(database_url).await.unwrap();

        let cors = CorsLayer::new()
            .allow_origin(HeaderValue::from_static("http://localhost:3000"))
            .allow_methods(vec![Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers(vec![
                HeaderName::from_static("content-type"),
                HeaderName::from_static("upgrade"),
                HeaderName::from_static("connection"),
                HeaderName::from_static("authorization"),
            ])
            .allow_credentials(true);

        let app = Router::new()
            .merge(auth_routes())
            .merge(user_routes())
            .merge(issue_routes())
            .merge(comment_routes())
            .merge(owner_routes())
            .merge(project_routes())
            .route("/ws", get(ws_handler))
            .route("/", get(|| async { "Tracker Root" }))
            .with_state(conn.clone())
            .route_layer(tower::layer::layer_fn(move |inner| AuthMiddleware {
                inner,
                db: conn.clone(),
            }))
            .layer(cors);

        let port = std::env::var("PORT")
            .unwrap_or_else(|_| "3001".to_string())
            .parse::<u16>()
            .unwrap();
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        info!("Listening on {}", addr);
        let listener = TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    });
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));

    match auth_header {
        Some(token) => {
            let token_crud = TokenCrud::new(db);
            let now = chrono::Utc::now();

            match token_crud
                .find_valid_token(token.to_string(), now.into())
                .await
            {
                Ok(Some(_)) => {
                    println!("WebSocket connection upgraded");
                    ws.on_upgrade(handle_socket)
                }
                _ => StatusCode::UNAUTHORIZED.into_response(),
            }
        }
        None => StatusCode::UNAUTHORIZED.into_response(),
    }
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
