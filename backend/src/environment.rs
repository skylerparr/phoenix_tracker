use lazy_static::lazy_static;
use std::env;
use std::path::PathBuf;
use tracing::Level;

// Centralized environment configuration with defaults where appropriate.
// Values are loaded once at startup (first access) and cached.

lazy_static! {
    // Security
    static ref JWT_SECRET: String = env::var("JWT_SECRET")
        .unwrap_or_else(|_| "default_secret_key_change_in_production".to_string());

    // Logging
    static ref LOG_LEVEL: Level = env::var("LOG_LEVEL")
        .unwrap_or_else(|_| "INFO".to_string())
        .parse::<Level>()
        .unwrap_or(Level::INFO);

    // Server
    static ref PORT: u16 = env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()
        .unwrap_or(3001);

    // Websocket settings
    static ref WEBSOCKET_BUFFER_SIZE: usize = env::var("WEBSOCKET_BUFFER_SIZE")
        .unwrap_or_else(|_| "1000".to_string())
        .parse::<usize>()
        .unwrap_or(1000);

    // Database
    static ref DATABASE_URL: String = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // CORS / Frontend
    static ref FRONTEND_URL: String = env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    // Public base URL used in generating asset links
    static ref PUBLIC_BASE_URL: String = env::var("PUBLIC_BASE_URL")
        .unwrap_or_else(|_| format!("http://localhost:{}", *PORT));

    // File store configuration
    // We default the scheme to "local" if not set.
    static ref FILE_STORE_SCHEME: String = env::var("FILE_STORE_SCHEME")
        .unwrap_or_else(|_| "local".to_string());

    // For local file storage, base path is required by parts of the system; keep as Option here
    // and let call sites enforce requirements with custom errors.
    static ref BASE_FILE_PATH: Option<PathBuf> = env::var("BASE_FILE_PATH").ok().map(PathBuf::from);

    // Upload constraints
    static ref MAX_UPLOAD_SIZE_MB: i64 = env::var("MAX_UPLOAD_SIZE_MB")
        .ok()
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(10);

    // AWS S3 configuration (used when FILE_STORE_SCHEME=aws)
    static ref S3_BUCKET: Option<String> = env::var("S3_BUCKET").ok();
    static ref AWS_REGION: Option<String> = env::var("AWS_REGION").ok();
    static ref S3_ENDPOINT_URL: Option<String> = env::var("S3_ENDPOINT_URL").ok();
    static ref S3_PUBLIC_ENDPOINT_URL: Option<String> = env::var("S3_PUBLIC_ENDPOINT_URL").ok();
    static ref S3_FORCE_PATH_STYLE: bool = env::var("S3_FORCE_PATH_STYLE")
        .ok()
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true") || v.eq_ignore_ascii_case("yes"))
        .unwrap_or(false);
    static ref S3_PRESIGN_TTL_SECONDS: u64 = env::var("S3_PRESIGN_TTL_SECONDS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(900);

    // Gotify notification configuration
    static ref GOTIFY_URL: String = env::var("GOTIFY_URL")
        .unwrap_or_else(|_| "http://gotify:80".to_string());
    static ref GOTIFY_TOKEN: Option<String> = env::var("GOTIFY_TOKEN").ok();
}

// ---- Public accessors (static-style) ----

pub fn jwt_secret() -> &'static str {
    &JWT_SECRET
}

pub fn log_level() -> Level {
    *LOG_LEVEL
}

pub fn websocket_buffer_size() -> usize {
    *WEBSOCKET_BUFFER_SIZE
}

pub fn database_url() -> &'static str {
    &DATABASE_URL
}

pub fn frontend_url() -> &'static str {
    &FRONTEND_URL
}

pub fn port() -> u16 {
    *PORT
}

pub fn public_base_url() -> &'static str {
    &PUBLIC_BASE_URL
}

pub fn file_store_scheme() -> &'static str {
    &FILE_STORE_SCHEME
}

pub fn base_file_path() -> Option<&'static PathBuf> {
    BASE_FILE_PATH.as_ref()
}

pub fn max_upload_size_mb() -> i64 {
    *MAX_UPLOAD_SIZE_MB
}

pub fn max_upload_size_bytes() -> usize {
    max_upload_size_mb() as usize * 1024 * 1024
}

// ---- S3-specific accessors ----

pub fn s3_bucket() -> Option<&'static str> {
    S3_BUCKET.as_deref()
}

pub fn s3_region() -> Option<&'static str> {
    AWS_REGION.as_deref()
}

pub fn s3_endpoint_url() -> Option<&'static str> {
    S3_ENDPOINT_URL.as_deref()
}

pub fn s3_public_endpoint_url() -> Option<&'static str> {
    S3_PUBLIC_ENDPOINT_URL.as_deref()
}

pub fn s3_force_path_style() -> bool {
    *S3_FORCE_PATH_STYLE
}

pub fn s3_presign_ttl_seconds() -> u64 {
    *S3_PRESIGN_TTL_SECONDS
}

// ---- Gotify notification accessors ----

pub fn gotify_url() -> &'static str {
    &GOTIFY_URL
}

pub fn gotify_token() -> Option<&'static str> {
    GOTIFY_TOKEN.as_deref()
}
