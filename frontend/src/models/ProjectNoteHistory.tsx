export class ProjectNoteHistory {
  id: number;
  projectNoteId: number;
  action: string;
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.projectNoteId = data.project_note_id;
    this.action = data.action;
    this.userId = data.user_id;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
