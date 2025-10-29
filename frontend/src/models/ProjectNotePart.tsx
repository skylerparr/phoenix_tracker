export class ProjectNotePart {
  id: number;
  projectNoteId: number;
  parentId: number | null;
  idx: number;
  partType: string;
  content: string | null;
  data: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.projectNoteId = data.project_note_id;
    this.parentId = data.parent_id || null;
    this.idx = data.idx;
    this.partType = data.part_type;
    this.content = data.content || null;
    this.data = data.data || null;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
