import { BaseService } from "./base/BaseService";
import { Project } from "../models/Project";
import { sessionStorage } from "../store/Session";

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

  async switchToProject(projectId: number): Promise<void> {
    const token = sessionStorage.getToken();
    const response = await fetch(
      `${this.baseUrl.replace("/projects", "")}/auth/switch-project`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token || "",
        },
        body: JSON.stringify({ projectId: projectId }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to switch project");
    }

    const data = await response.json();

    // Update session storage with new token
    sessionStorage.updateUserToken(data.token);

    // Verify the token was set correctly multiple times to ensure it's stable
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Double-check that the token really stuck
    await new Promise((resolve) => setTimeout(resolve, 100));
    const verifyToken = sessionStorage.getToken();

    if (verifyToken !== data.token) {
      console.error(
        "Token update failed! Expected:",
        data.token,
        "Got:",
        verifyToken,
      );
      throw new Error("Token update failed");
    }

    // Add a longer delay to ensure all async token updates are complete
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export const projectService = new ProjectService();
