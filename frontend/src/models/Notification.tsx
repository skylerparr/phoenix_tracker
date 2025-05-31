export class Notification {
  id: number;
  title: string;
  description: string;
  projectId: number;
  issueId: number;
  initiatedByUserId: number;
  targetedUserId: number;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.projectId = data.project_id;
    this.issueId = data.issue_id;
    this.initiatedByUserId = data.initiated_by_user_id;
    this.targetedUserId = data.targeted_user_id;
    this.read = data.read;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
