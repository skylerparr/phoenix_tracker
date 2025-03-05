import { BaseService } from "./base/BaseService";
import { ProjectNote } from "../models/ProjectNote";

export interface CreateProjectNoteRequest {
  title: string;
  detail: string;
}

export interface UpdateProjectNoteRequest {
  title?: string;
  detail?: string;
}

export class ProjectNoteService extends BaseService<ProjectNote> {
  constructor() {
    super("/project-notes");
  }

  protected createInstance(data: any): ProjectNote {
    return new ProjectNote(data);
  }

  async createProjectNote(
    request: CreateProjectNoteRequest,
  ): Promise<ProjectNote> {
    return this.post<ProjectNote>("", request);
  }

  async getProjectNoteById(id: number): Promise<ProjectNote> {
    return this.get<ProjectNote>(`/${id}`);
  }

  async getProjectNotesByProject(): Promise<ProjectNote[]> {
    return this.get<ProjectNote[]>(`/project`);
  }

  async updateProjectNote(
    id: number,
    request: UpdateProjectNoteRequest,
  ): Promise<ProjectNote> {
    return this.put<ProjectNote>(`/${id}`, request);
  }

  async deleteProjectNote(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }
}

export const projectNoteService = new ProjectNoteService();
