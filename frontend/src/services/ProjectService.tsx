import { API_BASE_URL } from "../config/ApiConfig";
import { Project } from "../models/Project";
import { sessionStorage } from "../store/Session";

interface CreateProjectRequest {
  name: string;
}

export class ProjectService {
  private baseUrl = `${API_BASE_URL}/projects`;

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const defaultOptions: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, mergedOptions);
    return response;
  }

  private async handleResponse<T>(
    response: Response,
    errorMessage: string,
  ): Promise<T> {
    if (!response.ok) throw new Error(errorMessage);
    return response.json();
  }

  async createProject(request: CreateProjectRequest): Promise<Project> {
    const response = await this.fetchWithAuth("", {
      method: "POST",
      body: JSON.stringify(request),
    });
    return this.handleResponse<Project>(response, "Failed to create project");
  }

  async getProject(id: number): Promise<Project> {
    const response = await this.fetchWithAuth(`/${id}`);
    return this.handleResponse<Project>(response, "Failed to fetch project");
  }

  async getAllProjectsByUserId(): Promise<Project[]> {
    const response = await this.fetchWithAuth(`/user/me`);
    return this.handleResponse<Project[]>(
      response,
      "Failed to fetch user projects",
    );
  }

  async deleteProject(id: number): Promise<void> {
    const response = await this.fetchWithAuth(`/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete project");
  }

  async selectProject(id: number): Promise<Project> {
    const response = await this.fetchWithAuth(`/${id}/user`, {
      method: "POST",
    });
    return this.handleResponse<Project>(response, "Failed to select project");
  }
}

export const projectService = new ProjectService();
