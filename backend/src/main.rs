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
    auth::auth_routes, blocker::blocker_routes, comment::comment_routes, history::history_routes,
    import_export::import_export_routes, issue::issue_routes,
    issue_assignee::issue_assignee_routes, issue_tag::issue_tag_routes,
    notification::notification_routes, owner::owner_routes, project::project_routes,
    project_note::project_note_routes, tag::tag_routes, task::task_routes, user::user_routes,
};
use sea_orm::{Database, DatabaseConnection};
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
mod jwt;
mod websocket;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub tx: Arc<broadcast::Sender<String>>,
    pub user: Option<entities::user::Model>,
    pub project: Option<entities::project::Model>,
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
    State(app_state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    if req.uri().path().starts_with("/api/auth")
        || req.uri().path().starts_with("/ws")
        || req.uri().path().starts_with("/api/projects")
        || req.uri().path().starts_with("/api/users")
    {
        info!("Skipping project validation for auth, ws, projects, and users routes");
        // Still validate user authentication for non-auth routes
        if !req.uri().path().starts_with("/api/auth") && !req.uri().path().starts_with("/ws") {
            let auth_header = req
                .headers()
                .get(AUTHORIZATION)
                .and_then(|value| value.to_str().ok());

            if let Some(auth_header_value) = auth_header {
                if let Some(token) = JwtService::extract_bearer_token(auth_header_value) {
                    let jwt_service = JwtService::new();
                    match jwt_service.validate_token(token) {
                        Ok(claims) => {
                            let user_crud = UserCrud::new(app_state.clone());
                            if let Ok(Some(user)) = user_crud.find_by_id(claims.user_id).await {
                                req.extensions_mut().insert(app_state.clone());
                                req.extensions_mut().get_mut::<AppState>().unwrap().user =
                                    Some(user.clone());

                                // Also extract project from JWT if present (for routes like /api/users)
                                if let Some(project_id) = claims.project_id {
                                    let project_crud = ProjectCrud::new(app_state.clone());
                                    if let Ok(Some(project)) =
                                        project_crud.find_by_id(project_id).await
                                    {
                                        req.extensions_mut()
                                            .get_mut::<AppState>()
                                            .unwrap()
                                            .project = Some(project.clone());
                                        debug!(
                                            "Project ID from JWT for protected route: {:?}",
                                            project.id
                                        );
                                    }
                                }

                                return Ok(next.run(req).await);
                            }
                        }
                        Err(_) => return Err(StatusCode::UNAUTHORIZED),
                    }
                }
            }
            return Err(StatusCode::UNAUTHORIZED);
        }
        return Ok(next.run(req).await);
    }

    let auth_header = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok());

    if let Some(auth_header_value) = auth_header {
        debug!("Authorization header value: {}", auth_header_value);

        if let Some(token) = JwtService::extract_bearer_token(auth_header_value) {
            let jwt_service = JwtService::new();

            match jwt_service.validate_token(token) {
                Ok(claims) => {
                    debug!("Valid JWT found, user_id: {}", claims.user_id);
                    let user_crud = UserCrud::new(app_state.clone());

                    if let Ok(Some(user)) = user_crud.find_by_id(claims.user_id).await {
                        debug!("Found user id: {:?}", user.id);
                        req.extensions_mut().insert(app_state.clone());
                        req.extensions_mut().get_mut::<AppState>().unwrap().user =
                            Some(user.clone());

                        // Get project from JWT claims (allows multiple projects per user simultaneously)
                        if let Some(project_id) = claims.project_id {
                            let project_crud = ProjectCrud::new(app_state.clone());
                            if let Ok(Some(project)) = project_crud.find_by_id(project_id).await {
                                req.extensions_mut().get_mut::<AppState>().unwrap().project =
                                    Some(project.clone());
                                debug!("Project ID from JWT: {:?}", project.id);
                            }
                        }
                        return Ok(next.run(req).await);
                    } else {
                        warn!("User not found for JWT user_id: {}", claims.user_id);
                        return Err(StatusCode::UNAUTHORIZED);
                    }
                }
                Err(e) => {
                    warn!("Invalid JWT token: {:?}", e);
                    return Err(StatusCode::UNAUTHORIZED);
                }
            }
        } else {
            warn!("Invalid authorization header format");
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    warn!("No authorization token provided");
    Err(StatusCode::UNAUTHORIZED)
}

fn main() {
    // Set log level based on environment
    let log_level = std::env::var("LOG_LEVEL")
        .unwrap_or_else(|_| "INFO".to_string())
        .parse::<tracing::Level>()
        .unwrap_or(tracing::Level::INFO);

    tracing_subscriber::fmt()
        .with_max_level(log_level)
        .with_file(true)
        .with_line_number(true)
        .init();

    // Increase buffer size for production load and add monitoring
    let buffer_size = std::env::var("WEBSOCKET_BUFFER_SIZE")
        .unwrap_or_else(|_| "1000".to_string())
        .parse::<usize>()
        .unwrap_or(1000);

    info!(
        "Initializing broadcast channel with buffer size: {}",
        buffer_size
    );
    let (tx, _rx) = broadcast::channel::<String>(buffer_size);
    let tx = std::sync::Arc::new(tx);

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let conn = Database::connect(database_url).await.unwrap();

        let frontend_url =
            std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());

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

        let port = std::env::var("PORT")
            .unwrap_or_else(|_| "3001".to_string())
            .parse::<u16>()
            .unwrap();
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        info!("Listening on {}", addr);
        let listener = TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap()
    });
}
