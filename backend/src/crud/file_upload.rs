use crate::crud::comment_file_upload::CommentFileUploadCrud;
use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::ISSUE_UPDATED;
use crate::crud::history::HistoryCrud;
use crate::crud::issue::IssueCrud;
use crate::entities::{comment_file_upload, file_upload};
use crate::environment;
use crate::AppState;
use rand::{distributions::Alphanumeric, Rng};
use sea_orm::sea_query::Expr;
use sea_orm::*;
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
        let scheme = environment::file_store_scheme();
        match scheme {
            "local" => {
                // Construct full URL using PUBLIC_BASE_URL or default http://localhost:{PORT}
                let base = environment::public_base_url().to_string();
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

    // Find uploads for an issue that are not attached to any comment
    pub async fn find_unattached_by_issue_id(
        &self,
        issue_id: i32,
    ) -> Result<Vec<file_upload::Model>, DbErr> {
        let mut items = file_upload::Entity::find()
            .filter(file_upload::Column::IssueId.eq(issue_id))
            .join(
                JoinType::LeftJoin,
                file_upload::Relation::CommentFileUpload.def(),
            )
            .filter(
                Expr::col((
                    comment_file_upload::Entity,
                    comment_file_upload::Column::FileUploadId,
                ))
                .is_null(),
            )
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

    pub async fn delete(&self, id: i32) -> Result<(), DbErr> {
        // Fetch the model first so we can create history and broadcast after deletion
        let model_opt = file_upload::Entity::find_by_id(id)
            .one(&self.app_state.db)
            .await?;

        // Perform the deletion (DB record, related mappings, and stored file)
        self.delete_with_no_history(id).await?;

        // Create a history record for issue-scoped uploads
        if let (Some(model), Some(current_user_id)) = (
            model_opt.as_ref(),
            self.app_state.user.as_ref().map(|u| u.id),
        ) {
            if let Some(issue_id) = model.issue_id {
                let history_crud = HistoryCrud::new(self.app_state.db.clone());
                let _ = history_crud
                    .create(
                        current_user_id,
                        Some(issue_id),
                        None,
                        None,
                        format!("deleted attachment '{}'", model.original_filename),
                    )
                    .await;
            }
        }

        // Broadcast an issue update if applicable
        if let Some(model) = model_opt {
            if let Some(issue_id) = model.issue_id {
                let project = self.app_state.project.clone();
                let project_id = project.unwrap().id;

                if let Some(issue) = IssueCrud::new(self.app_state.clone())
                    .find_by_id(issue_id)
                    .await?
                {
                    let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());
                    broadcaster.broadcast_event(
                        project_id,
                        ISSUE_UPDATED,
                        serde_json::json!(issue),
                    );
                }
            }
        }

        Ok(())
    }

    pub async fn delete_with_no_history(&self, id: i32) -> Result<(), DbErr> {
        // Wrapper: create a transaction and call the txn variant to perform work atomically
        let txn = self.app_state.db.begin().await?;
        self.delete_with_no_history_txn(id, &txn).await?;
        txn.commit().await?;
        Ok(())
    }

    // Transaction-aware variant used by higher-level operations that manage their own txn
    pub async fn delete_with_no_history_txn(
        &self,
        id: i32,
        txn: &DatabaseTransaction,
    ) -> Result<(), DbErr> {
        let Some(model) = file_upload::Entity::find_by_id(id).one(txn).await? else {
            return Ok(());
        };

        // Remove any comment-file associations first to avoid FK issues
        let cfu_crud = CommentFileUploadCrud::new(self.app_state.clone());
        cfu_crud.delete_all_by_file_upload_id_txn(id, txn).await?;

        // Delete the DB record for the file upload
        file_upload::Entity::delete_by_id(id).exec(txn).await?;

        // Delete the underlying object from storage
        let store = FileStore::from_env()?;
        store.delete(&model.path).await.map_err(to_db_err)?;

        Ok(())
    }

    pub async fn delete_all_by_issue_id(&self, issue_id: i32) -> Result<(), DbErr> {
        // Replicate core delete() behavior for each upload, but omit history creation
        // and event broadcasting. Use a single transaction and reuse the file store.
        let txn = self.app_state.db.begin().await?;

        // Load all uploads for this issue within the transaction
        let uploads = file_upload::Entity::find()
            .filter(file_upload::Column::IssueId.eq(issue_id))
            .all(&txn)
            .await?;

        if uploads.is_empty() {
            txn.commit().await?;
            return Ok(());
        }

        let cfu_crud = CommentFileUploadCrud::new(self.app_state.clone());
        let store = FileStore::from_env()?;

        for u in uploads {
            // Remove comment-file mappings for this upload
            cfu_crud
                .delete_all_by_file_upload_id_txn(u.id, &txn)
                .await?;

            // Delete upload record
            file_upload::Entity::delete_by_id(u.id).exec(&txn).await?;

            // Delete the underlying stored file
            store.delete(&u.path).await.map_err(to_db_err)?;
        }

        txn.commit().await?;
        Ok(())
    }

    pub async fn delete_all_by_project_note_id(&self, project_note_id: i32) -> Result<(), DbErr> {
        // Replicate core delete() behavior for each upload, but omit history creation
        // and event broadcasting. Use a single transaction and reuse the file store.
        let txn = self.app_state.db.begin().await?;

        // Load all uploads for this project note within the transaction
        let uploads = file_upload::Entity::find()
            .filter(file_upload::Column::ProjectNoteId.eq(project_note_id))
            .all(&txn)
            .await?;

        if uploads.is_empty() {
            txn.commit().await?;
            return Ok(());
        }

        let cfu_crud = CommentFileUploadCrud::new(self.app_state.clone());
        let store = FileStore::from_env()?;

        for u in uploads {
            // Remove comment-file mappings for this upload (should be none for project notes, but safe)
            cfu_crud
                .delete_all_by_file_upload_id_txn(u.id, &txn)
                .await?;

            // Delete upload record
            file_upload::Entity::delete_by_id(u.id).exec(&txn).await?;

            // Delete the underlying stored file
            store.delete(&u.path).await.map_err(to_db_err)?;
        }

        txn.commit().await?;
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
        let max_mb: i64 = environment::max_upload_size_mb();
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
        let scheme = environment::file_store_scheme().to_string();
        match scheme.as_str() {
            "local" => {
                let base = environment::base_file_path().cloned().ok_or_else(|| {
                    DbErr::Custom("BASE_FILE_PATH must be set for local file store".into())
                })?;
                Ok(Self {
                    inner: FileStoreInner::Local(LocalFileStore { base_path: base }),
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
    // Fallback from mime (best-effort mapping of common MDN types)
    match mime_type {
        // Text
        "text/plain" => "txt".into(),
        "text/markdown" => "md".into(),
        "text/html" => "html".into(),
        "text/css" => "css".into(),
        "text/csv" => "csv".into(),
        "text/xml" => "xml".into(),
        "application/xml" => "xml".into(),
        "application/json" => "json".into(),
        "application/javascript" | "text/javascript" => "js".into(),

        // Images
        "image/png" => "png".into(),
        "image/jpeg" | "image/jpg" => "jpg".into(),
        "image/gif" => "gif".into(),
        "image/webp" => "webp".into(),
        "image/bmp" => "bmp".into(),
        "image/tiff" => "tiff".into(),
        "image/svg+xml" => "svg".into(),
        "image/x-icon" | "image/vnd.microsoft.icon" => "ico".into(),
        "image/avif" => "avif".into(),

        // Audio
        "audio/mpeg" => "mp3".into(),
        "audio/ogg" => "ogg".into(),
        "audio/wav" | "audio/wave" | "audio/x-wav" => "wav".into(),
        "audio/webm" => "webm".into(),
        "audio/aac" => "aac".into(),
        "audio/midi" | "audio/x-midi" => "mid".into(),

        // Video
        "video/mp4" => "mp4".into(),
        "video/webm" => "webm".into(),
        "video/ogg" => "ogv".into(),
        "video/x-msvideo" => "avi".into(),
        "video/quicktime" => "mov".into(),
        "video/x-matroska" => "mkv".into(),

        // Documents
        "application/pdf" => "pdf".into(),
        "application/msword" => "doc".into(),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => "docx".into(),
        "application/vnd.ms-excel" => "xls".into(),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => "xlsx".into(),
        "application/vnd.ms-powerpoint" => "ppt".into(),
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" => {
            "pptx".into()
        }
        "application/rtf" => "rtf".into(),
        "application/vnd.oasis.opendocument.text" => "odt".into(),
        "application/vnd.oasis.opendocument.spreadsheet" => "ods".into(),
        "application/vnd.oasis.opendocument.presentation" => "odp".into(),

        // Archives and binaries
        "application/zip" => "zip".into(),
        "application/gzip" => "gz".into(),
        "application/x-7z-compressed" => "7z".into(),
        "application/x-rar-compressed" | "application/vnd.rar" => "rar".into(),
        "application/x-tar" => "tar".into(),
        "application/x-bzip" => "bz".into(),
        "application/x-bzip2" => "bz2".into(),
        "application/octet-stream" => "bin".into(),

        // Fonts
        "font/ttf" => "ttf".into(),
        "font/otf" => "otf".into(),
        "font/woff" => "woff".into(),
        "font/woff2" => "woff2".into(),

        // 3D/model
        "model/3mf" => "3mf".into(),
        "model/gltf+json" => "gltf".into(),
        "model/gltf-binary" => "glb".into(),

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
