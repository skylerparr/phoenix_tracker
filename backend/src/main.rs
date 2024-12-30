use crate::crud::token::TokenCrud;
use axum::body::Body;
use axum::extract::Request;
use axum::http::header::AUTHORIZATION;
use axum::http::StatusCode;
use axum::response::Response;
use axum::{
    http::{HeaderName, HeaderValue, Method},
    routing::get,
    Router,
};
use endpoints::{
    auth::auth_routes, comment::comment_routes, issue::issue_routes, owner::owner_routes,
    project::project_routes, tag::tag_routes, user::user_routes,
};
use futures::future::BoxFuture;
use sea_orm::{Database, DatabaseConnection};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tower_http::cors::CorsLayer;
use tower_service::Service;
use tracing::{debug, info, warn};

mod crud;
mod endpoints;
mod entities;
mod websocket;

#[derive(Clone)]
struct AuthMiddleware<S> {
    inner: S,
    db: DatabaseConnection,
}

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub tx: Arc<broadcast::Sender<String>>,
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

    let (tx, _rx) = broadcast::channel::<String>(100);
    let tx = std::sync::Arc::new(tx);

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
        let app_state = AppState {
            db: conn.clone(),
            tx: tx.clone(),
        };

        let app = Router::new()
            .merge(auth_routes())
            .merge(user_routes())
            .merge(issue_routes())
            .merge(comment_routes())
            .merge(owner_routes())
            .merge(project_routes())
            .merge(tag_routes())
            .route("/ws", get(websocket::ws_handler))
            .route("/", get(|| async { "Tracker Root" }))
            .with_state(app_state)
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
