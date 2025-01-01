import { API_BASE_URL } from "../config/ApiConfig";
import { Issue } from "../models/Issue";
import { sessionStorage } from "../store/Session";

interface CreateIssueRequest {
  title: string;
  description: string;
  priority: number;
  status: number;
  projectId: number;
  userId: number;
}

interface UpdateIssueRequest {
  title?: string;
  description?: string;
  priority?: number;
  status?: number;
  projectId?: number;
}

export class IssueService {
  private baseUrl = `${API_BASE_URL}/issues`;

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `${sessionStorage.getSession().user?.token}`,
    };
  }

  async createIssue(request: CreateIssueRequest): Promise<Issue> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create issue");
    return response.json();
  }

  async getAllIssues(): Promise<Issue[]> {
    const response = await fetch(this.baseUrl, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch issues");
    return response.json();
  }

  async getIssue(id: number): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch issue");
    return response.json();
  }

  async updateIssue(id: number, request: UpdateIssueRequest): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update issue");
    return response.json();
  }

  async deleteIssue(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete issue");
  }
}

export const issueService = new IssueService();
