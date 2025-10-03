import { FileUpload } from "./FileUpload";

export class Comment {
  id: number;
  content: string;
  userId: number;
  issueId: number;
  createdAt: Date;
  updatedAt: Date;
  uploads: FileUpload[];

  constructor(data: any) {
    this.id = data.id;
    this.content = data.content;
    this.userId = data.user_id;
    this.issueId = data.issue_id;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
    this.uploads = Array.isArray(data.uploads)
      ? data.uploads.map((u: any) => new FileUpload(u))
      : [];
  }
}
