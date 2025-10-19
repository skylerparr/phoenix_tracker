export class History {
  id: number;
  userId: number;
  issueId: number | null;
  commentId: number | null;
  taskId: number | null;
  action: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.userId = data.user_id;
    this.issueId = data.issue_id;
    this.commentId = data.comment_id;
    this.taskId = data.task_id;
    this.action = data.action;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
    console.log(data.created_at);
    console.log(this);
  }
}
