import { API_BASE_URL } from "../config/ApiConfig";
import { Project } from "../models/Project";

interface CreateProjectRequest {
  name: string;
  description: string;
  owner_id: number;
}

interface UpdateProjectRequest {
  name?: string;
  description?: string;
  owner_id?: number;
}

export class ProjectService {
  private baseUrl = `${API_BASE_URL}/projects`;

  async createProject(request: CreateProjectRequest): Promise<Project> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create project");
    return response.json();
  }

  async getAllProjects(): Promise<Project[]> {
    const response = await fetch(this.baseUrl, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch projects");
    return response.json();
  }

  async getProject(id: number): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch project");
    return response.json();
  }

  async updateProject(
    id: number,
    request: UpdateProjectRequest,
  ): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update project");
    return response.json();
  }

  async deleteProject(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to delete project");
  }
}

export const projectService = new ProjectService();
