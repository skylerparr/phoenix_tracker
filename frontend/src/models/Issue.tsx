export class Issue {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  projectId: number;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.priority = data.priority;
    this.status = data.status;
    this.projectId = data.project_id;
    this.createdById = data.created_by_id;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
