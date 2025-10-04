use crate::entities::file_upload;
use crate::AppState;
use rand::{distributions::Alphanumeric, Rng};
use sea_orm::*;
use std::env;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::AsyncWriteExt;

#[derive(Clone)]
pub struct FileUploadCrud {
    app_state: AppState,
}

impl FileUploadCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    // Generate a browser-accessible URL for a given upload.
    // - local: backend serves the file via authorized endpoint
    // - aws: TODO implement presigned S3 URL
    pub async fn generate_browser_url(&self, upload: &file_upload::Model) -> Result<String, DbErr> {
        let scheme = env::var("FILE_STORE_SCHEME").unwrap_or_else(|_| "local".to_string());
        match scheme.as_str() {
            "local" => {
                // Construct full URL if PUBLIC_BASE_URL provided; otherwise use http://localhost:{PORT}
                let base = env::var("PUBLIC_BASE_URL").unwrap_or_else(|_| {
                    let port = env::var("PORT")
                        .ok()
                        .and_then(|p| p.parse::<u16>().ok())
                        .unwrap_or(3001);
                    format!("http://localhost:{}", port)
                });
                // Serve the actual asset via the public API route; include final filename for nicer URLs
                Ok(format!(
                    "{}/api/uploads/assets/{}/{}?token={}",
                    base.trim_end_matches('/'),
                    upload.id,
                    upload.final_filename,
                    self.app_state.bearer_token.clone().unwrap()
                ))
            }
            "aws" => Err(DbErr::Custom(
                "TODO: implement AWS presigned URL generation".to_string(),
            )),
            other => Err(DbErr::Custom(format!(
                "Unsupported FILE_STORE_SCHEME for URL generation: {}",
                other
            ))),
        }
    }

    // Create for Issue using in-memory bytes (multipart should assemble into bytes before calling)
    pub async fn create_for_issue_from_bytes(
        &self,
        issue_id: i32,
        uploader_user_id: i32,
        original_filename: String,
        mime_type: String,
        bytes: Vec<u8>,
    ) -> Result<file_upload::Model, DbErr> {
        self.create_impl(
            Some(issue_id),
            None,
            uploader_user_id,
            original_filename,
            mime_type,
            bytes,
        )
        .await
    }

    // Create for Project Note using in-memory bytes
    pub async fn create_for_project_note_from_bytes(
        &self,
        project_note_id: i32,
        uploader_user_id: i32,
        original_filename: String,
        mime_type: String,
        bytes: Vec<u8>,
    ) -> Result<file_upload::Model, DbErr> {
        self.create_impl(
            None,
            Some(project_note_id),
            uploader_user_id,
            original_filename,
            mime_type,
            bytes,
        )
        .await
    }

    // Finders
    pub async fn find_by_id(&self, id: i32) -> Result<Option<file_upload::Model>, DbErr> {
        let mut result = file_upload::Entity::find_by_id(id)
            .one(&self.app_state.db)
            .await?;
        if let Some(ref mut model) = result {
            if model.full_url.is_none() {
                model.full_url = Some(self.generate_browser_url(model).await?);
            }
        }
        Ok(result)
    }

    pub async fn find_by_issue_id(&self, issue_id: i32) -> Result<Vec<file_upload::Model>, DbErr> {
        let mut items = file_upload::Entity::find()
            .filter(file_upload::Column::IssueId.eq(issue_id))
            .order_by_asc(file_upload::Column::UploadedAt)
            .all(&self.app_state.db)
            .await?;
        for m in &mut items {
            if m.full_url.is_none() {
                m.full_url = Some(self.generate_browser_url(m).await?);
            }
        }
        Ok(items)
    }

    pub async fn find_by_project_note_id(
        &self,
        project_note_id: i32,
    ) -> Result<Vec<file_upload::Model>, DbErr> {
        let mut items = file_upload::Entity::find()
            .filter(file_upload::Column::ProjectNoteId.eq(project_note_id))
            .order_by_asc(file_upload::Column::UploadedAt)
            .all(&self.app_state.db)
            .await?;
        for m in &mut items {
            if m.full_url.is_none() {
                m.full_url = Some(self.generate_browser_url(m).await?);
            }
        }
        Ok(items)
    }

    // Delete: remove object from store and DB
    pub async fn delete(&self, id: i32) -> Result<(), DbErr> {
        let txn = self.app_state.db.begin().await?;
        let Some(model) = file_upload::Entity::find_by_id(id).one(&txn).await? else {
            return Ok(()); // idempotent
        };

        let store = FileStore::from_env()?;
        store.delete(&model.path).await.map_err(to_db_err)?;

        file_upload::Entity::delete_by_id(id).exec(&txn).await?;
        txn.commit().await?;
        Ok(())
    }

    pub async fn delete_all_by_issue_id(&self, issue_id: i32) -> Result<(), DbErr> {
        let uploads = self.find_by_issue_id(issue_id).await?;
        for u in uploads {
            self.delete(u.id).await?;
        }
        Ok(())
    }

    pub async fn delete_all_by_project_note_id(&self, project_note_id: i32) -> Result<(), DbErr> {
        let uploads = self.find_by_project_note_id(project_note_id).await?;
        for u in uploads {
            self.delete(u.id).await?;
        }
        Ok(())
    }

    // Internal create implementation per spec
    async fn create_impl(
        &self,
        issue_id: Option<i32>,
        project_note_id: Option<i32>,
        uploader_user_id: i32,
        original_filename: String,
        mime_type: String,
        bytes: Vec<u8>,
    ) -> Result<file_upload::Model, DbErr> {
        // Validation
        if bytes.is_empty() {
            return Err(DbErr::Custom(
                "Empty file uploads are not allowed".to_string(),
            ));
        }
        let max_mb: i64 = env::var("MAX_UPLOAD_SIZE_MB")
            .ok()
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(10);
        let max_bytes = max_mb * 1024 * 1024;
        if (bytes.len() as i64) > max_bytes {
            return Err(DbErr::Custom(format!(
                "File exceeds max size of {} MB",
                max_mb
            )));
        }

        // Naming per spec
        let guid = generate_guid(10);
        let ext = derive_extension(&original_filename, &mime_type);
        let final_filename = format!("{}.{}", guid, ext);
        let storage_key = build_storage_key(&guid, &ext);

        let store = FileStore::from_env()?;

        // Handle collisions by regenerating GUID
        let storage_key = ensure_unique_key(&store, storage_key, &ext, 5).await?;
        let size_bytes = bytes.len() as i64;

        // Begin pseudo-atomic: write then insert DB; cleanup object if DB insert fails
        let txn = self.app_state.db.begin().await?;

        store
            .put(&storage_key, &mime_type, size_bytes, &bytes)
            .await
            .map_err(to_db_err)?;

        let result = file_upload::ActiveModel {
            issue_id: Set(issue_id),
            project_note_id: Set(project_note_id),
            uploader_user_id: Set(uploader_user_id),
            original_filename: Set(original_filename),
            final_filename: Set(final_filename),
            path: Set(storage_key.clone()),
            mime_type: Set(mime_type),
            size_bytes: Set(size_bytes),
            ..Default::default()
        }
        .insert(&txn)
        .await
        .map_err(|e| {
            // Clean up the file on DB error
            let store = store.clone();
            let key = storage_key.clone();
            tokio::spawn(async move {
                let _ = store.delete(&key).await;
            });
            e
        })?;

        txn.commit().await?;

        // Populate browser URL before returning
        let mut model = result;
        model.full_url = Some(self.generate_browser_url(&model).await?);
        Ok(model)
    }
}

// ---------------- Storage abstraction (single active backend) ----------------

#[derive(Clone)]
struct FileStore {
    inner: FileStoreInner,
}

#[derive(Clone)]
enum FileStoreInner {
    Local(LocalFileStore),
    Aws, // stub only; not implemented yet
}

impl FileStore {
    fn from_env() -> Result<Self, DbErr> {
        let scheme = env::var("FILE_STORE_SCHEME").map_err(|_| {
            DbErr::Custom("FILE_STORE_SCHEME must be set to 'local' or 'aws'".into())
        })?;
        match scheme.as_str() {
            "local" => {
                let base = env::var("BASE_FILE_PATH").map_err(|_| {
                    DbErr::Custom("BASE_FILE_PATH must be set for local file store".into())
                })?;
                Ok(Self {
                    inner: FileStoreInner::Local(LocalFileStore {
                        base_path: PathBuf::from(base),
                    }),
                })
            }
            "aws" => Ok(Self {
                inner: FileStoreInner::Aws,
            }),
            other => Err(DbErr::Custom(format!(
                "Unsupported FILE_STORE_SCHEME: {} (expected 'local' or 'aws')",
                other
            ))),
        }
    }

    async fn exists(&self, storage_key: &str) -> Result<bool, std::io::Error> {
        match &self.inner {
            FileStoreInner::Local(s) => s.exists(storage_key).await,
            FileStoreInner::Aws => Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "AWS exists() not implemented",
            )),
        }
    }

    async fn put(
        &self,
        storage_key: &str,
        content_type: &str,
        content_length: i64,
        bytes: &[u8],
    ) -> Result<(), std::io::Error> {
        let _ = (content_type, content_length); // currently unused for Local
        match &self.inner {
            FileStoreInner::Local(s) => s.put(storage_key, bytes).await,
            FileStoreInner::Aws => Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "AWS put() not implemented",
            )),
        }
    }

    async fn delete(&self, storage_key: &str) -> Result<(), std::io::Error> {
        match &self.inner {
            FileStoreInner::Local(s) => s.delete(storage_key).await,
            FileStoreInner::Aws => Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "AWS delete() not implemented",
            )),
        }
    }
}

#[derive(Clone)]
struct LocalFileStore {
    base_path: PathBuf,
}

impl LocalFileStore {
    fn full_path(&self, storage_key: &str) -> PathBuf {
        self.base_path.join(storage_key)
    }

    async fn exists(&self, storage_key: &str) -> Result<bool, std::io::Error> {
        let path = self.full_path(storage_key);
        Ok(fs::metadata(path).await.is_ok())
    }

    async fn put(&self, storage_key: &str, bytes: &[u8]) -> Result<(), std::io::Error> {
        let full_path = self.full_path(storage_key);
        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        // Write atomically: write to temp then rename
        let tmp_path = tmp_path_for(&full_path);
        if let Some(parent) = tmp_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let mut file = fs::File::create(&tmp_path).await?;
        file.write_all(bytes).await?;
        file.flush().await?;
        drop(file);

        // Atomic rename into place
        if let Err(e) = fs::rename(&tmp_path, &full_path).await {
            // Cleanup temp file on error
            let _ = fs::remove_file(&tmp_path).await;
            return Err(e);
        }
        Ok(())
    }

    async fn delete(&self, storage_key: &str) -> Result<(), std::io::Error> {
        let full_path = self.full_path(storage_key);
        if fs::metadata(&full_path).await.is_ok() {
            // Best-effort remove; ignore not found
            let _ = fs::remove_file(&full_path).await;
        }
        Ok(())
    }
}

fn tmp_path_for(final_path: &Path) -> PathBuf {
    let mut tmp = final_path.to_path_buf();
    let fname = final_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("tmpfile");
    let tmp_name = format!(".tmp-{}-{}", fname, generate_guid(6));
    tmp.set_file_name(tmp_name);
    tmp
}

// ---------------- Helpers ----------------

fn generate_guid(len: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .filter(|c| c.is_ascii_alphanumeric())
        .map(char::from)
        .take(len)
        .collect()
}

fn derive_extension(original_filename: &str, mime_type: &str) -> String {
    if let Some(ext) = Path::new(original_filename)
        .extension()
        .and_then(|e| e.to_str())
    {
        let e = sanitize_ext(ext);
        if !e.is_empty() {
            return e;
        }
    }
    // Fallback from mime
    match mime_type {
        "application/pdf" => "pdf".into(),
        "application/json" => "json".into(),
        "text/plain" => "txt".into(),
        "image/png" => "png".into(),
        "image/jpeg" => "jpg".into(),
        "image/jpg" => "jpg".into(),
        "image/svg+xml" => "svg".into(),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => "docx".into(),
        "application/msword" => "doc".into(),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => "xlsx".into(),
        "application/vnd.ms-excel" => "xls".into(),
        _ => "bin".into(),
    }
}

fn sanitize_ext(ext: &str) -> String {
    let e = ext.trim().trim_start_matches('.').to_ascii_lowercase();
    if e.chars().all(|c| c.is_ascii_alphanumeric()) {
        e
    } else {
        String::new()
    }
}

async fn ensure_unique_key(
    store: &FileStore,
    initial_key: String,
    ext: &str,
    max_attempts: usize,
) -> Result<String, DbErr> {
    let mut key = initial_key;
    for attempt in 0..max_attempts {
        let exists = store.exists(&key).await.map_err(to_db_err)?;
        if !exists {
            return Ok(key);
        }
        // regenerate
        let guid = generate_guid(10);
        key = build_storage_key(&guid, ext);
        if attempt == max_attempts - 1 {
            return Err(DbErr::Custom(
                "Failed to generate a unique storage key after retries".into(),
            ));
        }
    }
    Ok(key)
}

fn build_storage_key(guid: &str, ext: &str) -> String {
    let mut parts: Vec<String> = guid.chars().map(|c| c.to_string()).collect();
    parts.push(format!("{}.{}", guid, ext));
    parts.join("/")
}

fn to_db_err(e: std::io::Error) -> DbErr {
    DbErr::Custom(format!("file store error: {}", e))
}
