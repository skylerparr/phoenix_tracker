export class Issue {
  id: number;
  title: string;
  description: string;
  priority: number | null;
  points: number;
  status: number;
  isIcebox: boolean;
  workType: number;
  projectId: number;
  createdById: number;
  issueTagIds: number[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.priority = data.priority;
    this.points = data.points;
    this.status = data.status;
    this.isIcebox = data.is_icebox;
    this.workType = data.work_type;
    this.projectId = data.project_id;
    this.createdById = data.created_by_id;
    this.issueTagIds = data.issue_tag_ids;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}

export const POINTS = [0, 1, 2, 3, 5, 8];
