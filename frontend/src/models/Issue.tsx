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
  targetReleaseAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date | null;
  scheduledAt: Date | null;
  issueAssigneeIds: number[];

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
    this.targetReleaseAt = data.target_release_at
      ? new Date(data.target_release_at)
      : null;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
    this.acceptedAt = data.accepted_at ? new Date(data.accepted_at) : null;
    this.scheduledAt = data.scheduled_at ? new Date(data.scheduled_at) : null;
    this.issueAssigneeIds = data.issue_assignee_ids;
  }
}

export const POINTS = [0, 1, 2, 3, 5, 8];

export const WORK_TYPE_FEATURE = 0;
export const WORK_TYPE_BUG = 1;
export const WORK_TYPE_CHORE = 2;
export const WORK_TYPE_RELEASE = 3;
