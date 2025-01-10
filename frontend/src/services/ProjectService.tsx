import { BaseService } from "./base/BaseService";
import { Project } from "../models/Project";

interface CreateProjectRequest {
  name: string;
}

export class ProjectService extends BaseService<Project> {
  constructor() {
    super("/projects");
  }

  createInstance(data: any): Project {
    return new Project(data);
  }

  async createProject(request: CreateProjectRequest): Promise<Project> {
    return this.post<Project>("", request);
  }

  async getProject(id: number): Promise<Project> {
    return this.get<Project>(`/${id}`);
  }

  async getAllProjectsByUserId(): Promise<Project[]> {
    return this.get<Project[]>("/user/me");
  }

  async deleteProject(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async selectProject(id: number): Promise<Project> {
    return this.post<Project>(`/${id}/user`);
  }
}

export const projectService = new ProjectService();
