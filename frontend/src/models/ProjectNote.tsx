export class ProjectNote {
  id: number;
  projectId: number;
  title: string;
  detail: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.projectId = data.project_id;
    this.title = data.title;
    this.detail = data.detail;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
