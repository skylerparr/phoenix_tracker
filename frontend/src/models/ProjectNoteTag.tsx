import { ProjectNotePart } from "./ProjectNotePart";

export class ProjectNoteWithParts {
  id: number;
  title: string;
  parts: ProjectNotePart[];

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.parts = (data.parts || []).map(
      (part: any) => new ProjectNotePart(part),
    );
  }
}

export class ProjectNoteTag {
  id: number;
  projectNotePartId: number;
  projectId: number;
  tagName: string;
  createdAt: Date;
  updatedAt: Date;
  projectNoteParts: ProjectNoteWithParts[];

  constructor(data: any) {
    this.id = data.id;
    this.projectNotePartId = data.project_note_part_id;
    this.projectId = data.project_id;
    this.tagName = data.tag_name;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
    this.projectNoteParts = (data.project_note_parts || []).map(
      (note: any) => new ProjectNoteWithParts(note),
    );
  }
}
