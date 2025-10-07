import { BaseService } from "./base/BaseService";
import { FileUpload } from "../models/FileUpload";
import { API_BASE_URL } from "../config/ApiConfig";
import { sessionStorage } from "../store/Session";

interface CommentFileUploadMapping {
  commentId: number;
  fileUploadId: number;
  attachedAt: Date;
}

export class UploadService extends BaseService<FileUpload> {
  constructor() {
    super("/uploads");
  }

  protected createInstance(data: any): FileUpload {
    return new FileUpload(data);
  }

  /**
   * Override getHeaders to exclude Content-Type for multipart uploads
   * The browser will automatically set the correct boundary for multipart/form-data
   */
  protected getUploadHeaders(): HeadersInit {
    const token = sessionStorage.getToken();
    return {
      Authorization: token || "",
    };
  }

  /**
   * Upload a file for an issue
   */
  async uploadForIssue(issueId: number, file: File): Promise<FileUpload> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE_URL}/api/issues/${issueId}/uploads`,
      {
        method: "POST",
        headers: this.getUploadHeaders(),
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to upload file for issue ${issueId}`);
    }

    const data = await response.json();
    return this.createInstance(data);
  }

  /**
   * Upload a file for a project note
   */
  async uploadForProjectNote(
    projectNoteId: number,
    file: File,
  ): Promise<FileUpload> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE_URL}/api/project-notes/${projectNoteId}/uploads`,
      {
        method: "POST",
        headers: this.getUploadHeaders(),
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to upload file for project note ${projectNoteId}`,
      );
    }

    const data = await response.json();
    return this.createInstance(data);
  }

  /**
   * List uploads for an issue
   */
  async listForIssue(issueId: number): Promise<FileUpload[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/issues/${issueId}/uploads`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to list uploads for issue ${issueId}`);
    }

    const data = await response.json();
    return data.map((item: any) => this.createInstance(item));
  }

  /**
   * List uploads for a project note
   */
  async listForProjectNote(projectNoteId: number): Promise<FileUpload[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/project-notes/${projectNoteId}/uploads`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to list uploads for project note ${projectNoteId}`,
      );
    }

    const data = await response.json();
    return data.map((item: any) => this.createInstance(item));
  }

  /**
   * List uploads attached to a comment
   */
  async listForComment(commentId: number): Promise<CommentFileUploadMapping[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/comments/${commentId}/uploads`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to list uploads for comment ${commentId}`);
    }

    const data = await response.json();
    return data.map((item: any) => ({
      commentId: item.comment_id,
      fileUploadId: item.file_upload_id,
      attachedAt: new Date(item.attached_at),
    }));
  }

  /**
   * Attach an existing upload to a comment
   */
  async attachToComment(
    commentId: number,
    fileUploadId: number,
  ): Promise<CommentFileUploadMapping> {
    const response = await fetch(
      `${API_BASE_URL}/api/uploads/${fileUploadId}/comments/${commentId}`,
      {
        method: "POST",
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to attach upload ${fileUploadId} to comment ${commentId}`,
      );
    }

    const data = await response.json();
    return {
      commentId: data.comment_id,
      fileUploadId: data.file_upload_id,
      attachedAt: new Date(data.attached_at),
    };
  }

  /**
   * Detach an upload from a comment
   */
  async detachFromComment(
    commentId: number,
    fileUploadId: number,
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/comments/${commentId}/uploads/${fileUploadId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to detach upload ${fileUploadId} from comment ${commentId}`,
      );
    }
  }

  /**
   * Download an upload by ID
   * Returns a Blob for the file content
   */
  async downloadUpload(uploadId: number): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${uploadId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to download upload ${uploadId}`);
    }

    return response.blob();
  }

  /**
   * Delete an upload by ID
   */
  async deleteUpload(uploadId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${uploadId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete upload ${uploadId}`);
    }
  }

  /**
   * Helper method to validate file MIME type before upload
   * Allow all common MDN MIME types by accepting any standard top-level type with a non-empty subtype.
   * Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types
   */
  isAllowedMimeType(mimeType: string): boolean {
    if (!mimeType || typeof mimeType !== "string") return false;
    const main = mimeType.split(";")[0].trim();
    const [top, sub] = main.split("/");
    if (!top || !sub) return false;
    const allowedTop = new Set([
      "application",
      "audio",
      "font",
      "image",
      "model",
      "text",
      "video",
    ]);
    return allowedTop.has(top.toLowerCase()) && sub.trim().length > 0;
  }

  /**
   * Helper method to validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!file || file.size === 0) {
      return { valid: false, error: "File is empty" };
    }

    if (!this.isAllowedMimeType(file.type) && !file.name.endsWith(".md")) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`,
      };
    }

    // Add additional size check if needed (e.g., 10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of 10MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Upload multiple files for an issue
   */
  async uploadMultipleForIssue(
    issueId: number,
    files: File[],
  ): Promise<FileUpload[]> {
    const uploadPromises = files.map((file) =>
      this.uploadForIssue(issueId, file),
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Upload multiple files for a project note
   */
  async uploadMultipleForProjectNote(
    projectNoteId: number,
    files: File[],
  ): Promise<FileUpload[]> {
    const uploadPromises = files.map((file) =>
      this.uploadForProjectNote(projectNoteId, file),
    );
    return Promise.all(uploadPromises);
  }
}

export const uploadService = new UploadService();
