use crate::crud::project::ProjectCrud;
use crate::crud::token::TokenCrud;
use crate::crud::user::UserCrud;
use crate::crud::user_setting::UserSettingCrud;
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
    if req.uri().path().starts_with("/api/auth") || req.uri().path().starts_with("/ws") {
        info!("Skipping auth middleware for /api/auth and /ws route");
        return Ok(next.run(req).await);
    }

    let auth_header = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok());

    if let Some(token) = auth_header {
        debug!("Authorization header value: {}", token);
        let token_crud = TokenCrud::new(app_state.db.clone());
        let now = chrono::Utc::now();

        match token_crud
            .find_valid_token(token.to_string(), now.into())
            .await
        {
            Ok(Some(token_model)) => {
                debug!("Valid token found, proceeding with request");
                let user_crud = UserCrud::new(app_state.clone());
                if let Ok(Some(user)) = user_crud.find_by_id(token_model.user_id).await {
                    debug!("Found user id: {:?}", user.id);
                    req.extensions_mut().insert(app_state.clone());
                    req.extensions_mut().get_mut::<AppState>().unwrap().user = Some(user.clone());

                    let user_settings_crud = UserSettingCrud::new(app_state.db.clone());
                    if let Ok(user_settings) = user_settings_crud.find_by_user_id(user.id).await {
                        if let Some(project_id) = user_settings.project_id {
                            let project_crud = ProjectCrud::new(app_state.clone());
                            if let Ok(Some(project)) = project_crud.find_by_id(project_id).await {
                                req.extensions_mut().get_mut::<AppState>().unwrap().project =
                                    Some(project.clone());
                                debug!("Project ID: {:?}", project.id);
                            }
                        }
                    }
                    return Ok(next.run(req).await);
                }
            }
            _ => {
                warn!("Invalid or expired token provided");
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    }

    warn!("No authorization token provided");
    Err(StatusCode::UNAUTHORIZED)
}

fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::WARN)
        .with_file(true)
        .with_line_number(true)
        .init();

    let (tx, _rx) = broadcast::channel::<String>(100);
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
