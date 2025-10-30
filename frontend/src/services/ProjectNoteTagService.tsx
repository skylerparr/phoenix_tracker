import { BaseService } from "./base/BaseService";
import { ProjectNoteTag } from "../models/ProjectNoteTag";

export interface CreateProjectNoteTagRequest {
  projectNotePartId: number;
  tagName: string;
}

export class ProjectNoteTagService extends BaseService<ProjectNoteTag> {
  constructor() {
    super("/project-note-tags");
  }

  protected createInstance(data: any): ProjectNoteTag {
    return new ProjectNoteTag(data);
  }

  async getProjectNoteTagByTagName(tagName: string): Promise<ProjectNoteTag> {
    return this.get<ProjectNoteTag>(`/tag/${tagName}`);
  }
}

export const projectNoteTagService = new ProjectNoteTagService();
