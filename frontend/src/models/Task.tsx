export class Task {
  id: number;
  title: string;
  completed: boolean;
  percent: number;
  issueId: number;
  lockVersion: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.completed = data.completed;
    this.percent = data.percent;
    this.issueId = data.issue_id;
    this.lockVersion = data.lock_version;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
