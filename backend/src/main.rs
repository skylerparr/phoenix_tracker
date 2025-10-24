use crate::crud::project::ProjectCrud;
use crate::crud::user::UserCrud;
use crate::jwt::JwtService;
use axum::body::Body;
use axum::extract::Request;
use axum::http::header::AUTHORIZATION;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use axum::{extract::State, middleware};
use axum::{
    http::{HeaderName, HeaderValue, Method},
    routing::get,
    Router,
};
use endpoints::{
    auth::auth_routes, blocker::blocker_routes, comment::comment_routes,
    file_upload::file_upload_routes, history::history_routes, import_export::import_export_routes,
    issue::issue_routes, issue_assignee::issue_assignee_routes, issue_tag::issue_tag_routes,
    notification::notification_routes, owner::owner_routes, project::project_routes,
    project_note::project_note_routes, tag::tag_routes, task::task_routes, user::user_routes,
};
use sea_orm::{Database, DatabaseConnection};
use serde::Deserialize;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower_http::services::ServeFile;
use tracing::{debug, info, warn};

mod crud;
mod endpoints;
mod entities;
mod environment;
mod jwt;
mod websocket;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub tx: Arc<broadcast::Sender<String>>,
    pub user: Option<entities::user::Model>,
    pub project: Option<entities::project::Model>,
    pub bearer_token: Option<String>,
}

async fn logging_middleware(req: Request<Body>, next: Next) -> Result<Response, StatusCode> {
    let path = req.uri().path().to_owned();
    let method = req.method().clone();
    let start = Instant::now();

    let response = next.run(req).await;

    let duration = start.elapsed();
    let status_code = response.status();
    info!(
        "{} {} completed with status {} in {:?}",
        method, path, status_code, duration
    );

    Ok(response)
}
async fn auth_middleware(
    State(mut app_state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let path = req.uri().path();

    // Allow unauthenticated routes
    if path.starts_with("/api/auth") || path.starts_with("/ws") {
        return Ok(next.run(req).await);
    }

    // All other routes require a valid JWT. We set the user for all, and set project if present in claims.
    let mut auth_header: Option<String> = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .map(|s| s.to_string());

    if path.starts_with("/api/uploads/assets") {
        let query = req.uri().query();
        if let Some(query_str) = query {
            #[derive(Deserialize)]
            struct QueryParams {
                token: Option<String>,
            }

            let params: QueryParams =
                serde_urlencoded::from_str(query_str).map_err(|_| StatusCode::UNAUTHORIZED)?;

            auth_header = Some(format!("Bearer {}", params.token.unwrap()));
        }
    }

    if let Some(auth_header_value) = auth_header {
        debug!("Authorization header value: {}", auth_header_value);

        if let Some(token) = JwtService::extract_bearer_token(&auth_header_value) {
            debug!("Authorization header value: {}", auth_header_value);

            let jwt_service = JwtService::new();
            match jwt_service.validate_token(token) {
                Ok(claims) => {
                    debug!("Valid JWT found, user_id: {}", claims.user_id);

                    app_state.bearer_token = Some(token.to_string());

                    // Load user
                    let user_crud = UserCrud::new(app_state.clone());
                    let user = match user_crud.find_by_id(claims.user_id).await {
                        Ok(Some(u)) => u,
                        _ => return Err(StatusCode::UNAUTHORIZED),
                    };

                    // Attach to request extensions with user
                    req.extensions_mut().insert(app_state.clone());
                    if let Some(state) = req.extensions_mut().get_mut::<AppState>() {
                        state.user = Some(user);
                    }

                    // Optionally load project if present in JWT claims
                    info!("{:?}", claims);
                    if let Some(project_id) = claims.project_id {
                        let project_crud = ProjectCrud::new(app_state.clone());
                        if let Ok(Some(project)) = project_crud.find_by_id(project_id).await {
                            if let Some(state) = req.extensions_mut().get_mut::<AppState>() {
                                state.project = Some(project);
                            }
                        } else {
                            info!("unable to load project");
                        }
                    }

                    return Ok(next.run(req).await);
                }
                Err(e) => {
                    warn!("Invalid JWT token: {:?}", e);
                    return Err(StatusCode::UNAUTHORIZED);
                }
            }
        }
    }

    warn!("No authorization token provided");
    Err(StatusCode::UNAUTHORIZED)
}

fn main() {
    // Set log level based on environment
    let log_level = environment::log_level();

    tracing_subscriber::fmt()
        .with_max_level(log_level)
        .with_file(true)
        .with_line_number(true)
        .init();

    // Increase buffer size for production load and add monitoring
    let buffer_size = environment::websocket_buffer_size();

    info!(
        "Initializing broadcast channel with buffer size: {}",
        buffer_size
    );
    let (tx, _rx) = broadcast::channel::<String>(buffer_size);
    let tx = std::sync::Arc::new(tx);

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let database_url = environment::database_url();
        let conn = Database::connect(database_url).await.unwrap();

        let frontend_url = environment::frontend_url().to_string();

        let cors = CorsLayer::new()
            .allow_origin(HeaderValue::from_str(&frontend_url).unwrap_or_else(|_| {
                warn!("Invalid FRONTEND_URL format, falling back to default");
                HeaderValue::from_static("http://localhost:3000")
            }))
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
            user: None,
            project: None,
            bearer_token: None,
        };

        let api_routes = Router::new()
            .merge(auth_routes())
            .merge(user_routes())
            .merge(issue_routes())
            .merge(comment_routes())
            .merge(owner_routes())
            .merge(project_routes())
            .merge(tag_routes())
            .merge(issue_tag_routes())
            .merge(issue_assignee_routes())
            .merge(task_routes())
            .merge(blocker_routes())
            .merge(import_export_routes())
            .merge(file_upload_routes())
            .merge(history_routes())
            .merge(notification_routes())
            .merge(project_note_routes());

        let static_router = Router::new().nest_service(
            "/",
            ServeDir::new("static").fallback(ServeFile::new("static/index.html")),
        );

        let api_router = Router::new()
            .nest("/api", api_routes)
            .route("/ws", get(websocket::ws_handler))
            .layer(middleware::from_fn(logging_middleware))
            .layer(middleware::from_fn_with_state(
                app_state.clone(),
                auth_middleware,
            ))
            .layer(cors.clone())
            .with_state(app_state.clone());

        let app = Router::new()
            .merge(api_router)
            .fallback_service(static_router.clone())
            .layer(middleware::from_fn(logging_middleware))
            .layer(cors.clone());

        let port = environment::port();
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        info!("Listening on {}", addr);
        let listener = TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap()
    });
}
