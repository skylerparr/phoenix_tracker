export class FileUpload {
  id: number;
  issueId: number | null;
  projectNoteId: number | null;
  uploaderUserId: number;
  originalFilename: string;
  finalFilename: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
  fullUrl: string;

  constructor(data: any) {
    this.id = data.id;
    this.issueId = data.issue_id;
    this.projectNoteId = data.project_note_id;
    this.uploaderUserId = data.uploader_user_id;
    this.originalFilename = data.original_filename;
    this.finalFilename = data.final_filename;
    this.path = data.path;
    this.mimeType = data.mime_type;
    this.sizeBytes = data.size_bytes;
    this.uploadedAt = new Date(data.uploaded_at);
    this.fullUrl = data.full_url;
  }
}
