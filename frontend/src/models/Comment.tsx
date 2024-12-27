export class Comment {
  id: number;
  content: string;
  userId: number;
  issueId: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.content = data.content;
    this.userId = data.user_id;
    this.issueId = data.issue_id;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
