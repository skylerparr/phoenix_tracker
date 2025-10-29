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

  async createProjectNoteTag(
    request: CreateProjectNoteTagRequest,
  ): Promise<ProjectNoteTag> {
    return this.post<ProjectNoteTag>("", request);
  }

  async getProjectNoteTagByTagName(tagName: string): Promise<ProjectNoteTag> {
    return this.get<ProjectNoteTag>(`/tag/${tagName}`);
  }

  async deleteProjectNoteTagsByPartIds(
    projectNotePartIds: number[],
  ): Promise<void> {
    const ids = projectNotePartIds.join(",");
    return this.delete(`/part/${ids}`);
  }
}

export const projectNoteTagService = new ProjectNoteTagService();
