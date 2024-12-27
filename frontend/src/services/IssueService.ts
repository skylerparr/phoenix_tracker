import { API_BASE_URL } from "../config/ApiConfig";
import { Issue } from "../models/Issue";

interface CreateIssueRequest {
  title: string;
  description: string;
  priority: string;
  status: string;
  project_id: number;
  user_id: number;
}

interface UpdateIssueRequest {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  project_id?: number;
}

export class IssueService {
  private baseUrl = `${API_BASE_URL}/issues`;

  async createIssue(request: CreateIssueRequest): Promise<Issue> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create issue");
    return response.json();
  }

  async getAllIssues(): Promise<Issue[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) throw new Error("Failed to fetch issues");
    return response.json();
  }

  async getIssue(id: number): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) throw new Error("Failed to fetch issue");
    return response.json();
  }

  async updateIssue(id: number, request: UpdateIssueRequest): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update issue");
    return response.json();
  }

  async deleteIssue(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete issue");
  }
}

export const issueService = new IssueService();
