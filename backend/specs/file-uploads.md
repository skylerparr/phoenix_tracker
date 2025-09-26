# File Uploads Specification

Status: Draft

Owner: Backend Team

Last Updated: 2025-09-26

## Summary
Implement secure, configurable file uploads that can be associated to either an Issue or a Project Note. Files are stored using a storage abstraction that supports pluggable backends (local filesystem and AWS S3 initially), with only one storage backend active per environment. Files must not expose the original filename in any storage path and must be inaccessible to users outside the owning project.

## Goals
- Allow users to upload files associated with either:
  - a single Issue; or
  - a single Project Note.
- Allow an optional association for comments to have 0 to many files associated with a single comment, but the file is "owned" by the issue.
- Enforce access control so only members of the owning project can view or download the file or upload a file.
- Support a pluggable storage abstraction ("file store" trait) with these backends initially:
  - Local filesystem
  - AWS S3 (development may use Localstack)
- Only one storage backend can be configured per environment at a time.
- Config via environment variables:
  - FILE_STORE_SCHEME=local|aws
  - If local: BASE_FILE_PATH is required
  - If aws: S3 bucket configuration is required
- File naming:
  - Generate a 10-character, URL-safe GUID for the stored filename
  - Preserve an extension derived from the original file (or MIME type if needed)
  - Storage path must not include the original filename anywhere
  - Directory layout is derived from the GUID by splitting it per character to allow large fan-out
  - Example: GUID "id93Ji359k.png" is stored at path `i/d/9/3/J/i/3/5/9/k/id93Ji359k.png`
- The upload database table is abstract with no knowledge of physical storage location details (e.g., bucket or base path), and primarily stores:
  - original file name
  - upload date/time
  - MIME type
  - path (storage key)
  - final stored file name

## Non-Goals
- Multi-store mirroring or replication across stores
- Public or anonymous file access
- In-place file editing or media transformations
- CDN integration (can be considered later)

## Stakeholders and Users
- Project members who upload and download attachments
- Backend engineers implementing storage abstraction and APIs

## Functional Requirements
1. Associations
   - Each upload must be associated with exactly one of: Issue or Project Note.
   - Enforce at the data layer that exactly one of these relationships is present.

2. Upload
   - Accept file uploads via API (multipart/form-data). Client supplies the association target.
   - On upload:
     - Generate a 10-character GUID (base62/URL-safe)
     - Determine file extension: prefer original extension; fallback to MIME-based mapping when missing
     - Compute storage key using character-split directories plus final filename
     - Persist metadata record in the uploads table
     - Write file to the configured store atomically
3. Download
   - Authorized project members can download the file.
   - When using S3, generate a short-lived presigned URL only after authorization succeeds.
   - When using local storage, serve via backend with authorization enforced (NOT from public static paths).

4. Deletion
   - Authorized users may delete an upload.
   - Deletion fully deletes DB record and removes the object from the store, this must be in a transaction and both must succeed.
   - Deleting a parent entity (Issue/Project Note) cascades or blocks based on business rules. Default: cascade.

5. Authorization
   - Only users who are members of the owning project can view/download.
   - Users outside the project must not be able to view or infer existence.
   - Use 404 for non-members to avoid enumeration; use 403 when ownership is known but forbidden.

6. Validation
   - Allowed MIME types are only human readable/viewable media (pdf, txt, docx, png, jpg, svg, etc).
     - Add an environment variable called `MAX_UPLOAD_SIZE_MB` and default it to 10mb
   - Reject zero-byte uploads.
   - Optional: validate extension vs MIME type.

7. Observability
   - Log upload, access, and delete events with correlation IDs and actor IDs.
   - Emit metrics: upload count, failure count, average size, latency, storage errors.

## Non-Functional Requirements
- Configurability: Entirely controlled via environment variables.
- Scalability: Directory fan-out on local filesystem; S3 keys scale naturally.
- Reliability: Atomic writes; retries on transient store errors.
- Security: Authorization at API; no public ACLs; presigned URLs are short-lived (default 5 minutes) and unguessable.
- Performance: Streaming uploads/downloads; avoid reading full file into memory when possible.
- Portability: The database remains independent of store details.

## Storage Abstraction (Trait)
Define a trait/interface ("FileStore") to decouple storage from application logic. Proposed operations:
- put(input_stream, storage_key, content_type, content_length) -> void
  - Writes the file to the backend at storage_key
- presign_get_url(storage_key, expires_in_seconds) -> url (S3 only; Local returns null)
- open_read(storage_key) -> stream (Local only; S3 uses presigned URL)
- delete(storage_key) -> void
- exists(storage_key) -> bool

Implementations:
- LocalFileStore
  - Uses BASE_FILE_PATH as the root directory
  - Full path = BASE_FILE_PATH + "/" + storage_key
  - Creates intermediate directories if needed; ensures secure permissions
- S3FileStore
  - Requires bucket configuration and credentials
  - Uses storage_key as the S3 object key (no original filename anywhere)
  - Server-side encryption optional; path-style addressing for Localstack

Only one store is instantiated based on FILE_STORE_SCHEME.

## Storage Key and Directory Scheme
- GUID: 10-character URL-safe ID, e.g., base62 [A-Za-z0-9]
- Final filename: {GUID}.{ext}, where ext is derived from the original filename or MIME mapping
- Directory path: Split the 10-character GUID into 10 single-character directories in order
- Storage key: {c1}/{c2}/{c3}/{c4}/{c5}/{c6}/{c7}/{c8}/{c9}/{c10}/{GUID}.{ext}
- Example:
  - GUID with extension: id93Ji359k.png
  - Storage key: i/d/9/3/J/i/3/5/9/k/id93Ji359k.png

Collision Handling:
- Before writing, check exists(storage_key); on collision (extremely unlikely), regenerate GUID and retry.

## Configuration
Environment variables:
- FILE_STORE_SCHEME=local|aws

If FILE_STORE_SCHEME=local:
- BASE_FILE_PATH: absolute path where files are stored locally (must be writable by the app)

If FILE_STORE_SCHEME=aws:
- AWS_REGION: e.g., us-east-1
- S3_BUCKET: bucket name
- Optional for Localstack/dev:
  - S3_ENDPOINT: e.g., http://localhost:4566
  - S3_FORCE_PATH_STYLE=true
  - S3_USE_SSL=false
- Optional config:
  - S3_PRESIGN_TTL_SECONDS: default 300

Validation on startup:
- Exactly one valid scheme must be configured; fail fast otherwise.

## Database Schema (Abstract)
Table: file_uploads
- id: UUID, primary key
- issue_id: UUID, nullable, FK to issues.id
- project_note_id: UUID, nullable, FK to project_notes.id
- uploader_user_id: UUID, not null, FK to users.id
- original_filename: text, not null
- final_filename: text, not null (e.g., id93Ji359k.png)
- path: text, not null (the storage key, e.g., i/d/9/.../id93Ji359k.png)
- mime_type: text, not null
- size_bytes: bigint, not null
- is_thumbail: bool, not null, defaul false
- uploaded_at: timestamptz, not null, default now()

Constraints and Indexes:
- Exactly one association must be set: CHECK ((issue_id IS NOT NULL) <> (project_note_id IS NOT NULL))
- Indexes on issue_id, project_note_id, uploader_user_id
- Unique not required on path or final_filename given GUID randomness (path uniqueness is desirable but can be enforced by store write)

Notes:
- The table has no knowledge of which store is configured or any bucket/base path; `path` is a backend-agnostic storage key.

## API Design (High-Level)
- POST /api/issues/{issue_id}/uploads
  - multipart/form-data with file field
  - Authorization: user must be a member of the issue's project
  - Response: JSON with upload id, final_filename, mime_type, size_bytes, created_at

- POST /api/project_notes/{note_id}/uploads
  - Same behavior and response as above

- GET /api/uploads/{id}
  - Authorization: user must belong to the owning project
  - Local: stream the file from disk
  - S3: return 302 redirect to presigned URL (TTL per config)

- DELETE /api/uploads/{id}
  - Authorization required; soft-delete DB record and remove from store
  - Idempotent: deleting an already-deleted upload returns 204

Error Handling:
- 400 for validation failures (size, type)
- 403/404 per authorization and anti-enumeration policy
- 409 on rare GUID collision if surfaced; retry internally first
- 500 on storage backend errors (with appropriate logging/metrics)

## Security and Privacy
- No public bucket ACLs; S3 objects are private
- Presigned URLs are short-lived and only generated for authorized users
- Local files are never served from a public static directory; always gated by auth
- Optional: content scanning (antivirus) can be introduced later
- Avoid storing secrets in plaintext configs; prefer standard cloud credential mechanisms in prod

## Development and Localstack
- For aws scheme in development, use Localstack with S3_ENDPOINT and path-style addressing
- Provide a dockerized localstack service in dev tooling (compose) with a test bucket
- Seed scripts can create the bucket on startup

## Testing Strategy
 - Manual human verification

## Operational Considerations
- Backups: database backups are sufficient; store backups depend on backend policies (S3 durability vs local snapshots)
- Retention: define retention and deletion policies (TBD)
- Monitoring dashboards for upload rates, errors, and storage usage

## Risks and Mitigations
- GUID collision: mitigated via existence check and retry
- Large directory depth on local filesystem: acceptable by requirement; ensures high fan-out; S3 treats keys as flat
- MIME/extension mismatch: optional validation can prevent abuse
- Access control mistakes: centralize authorization checks and add comprehensive tests

## Acceptance Criteria
- Files can be uploaded and associated with either an Issue or a Project Note (exactly one)
- Only one storage backend is active per environment, driven by FILE_STORE_SCHEME
- Local and AWS S3 backends are supported; development can use Localstack
- Stored object keys never include the original filename; they use a 10-char GUID and character-split directories
- Database records store original filename, uploaded_at, mime_type, path (storage key), and final_filename (plus additional metadata as specified)
- Authorized project members can download; others cannot
- Deletion removes access and cleans up storage
- Tests exist (unit, integration, and E2E per project rules) and pass
