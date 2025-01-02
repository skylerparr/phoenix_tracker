import { API_BASE_URL } from "../config/ApiConfig";
import { Issue } from "../models/Issue";
import { sessionStorage } from "../store/Session";

interface CreateIssueRequest {
  title: string;
  description?: string;
  priority: number;
  points?: number | null;
  status: number;
  isIcebox: boolean;
  workType: number;
  targetReleaseAt?: string;
}

interface UpdateIssueRequest {
  title?: string;
  description?: string;
  priority?: number;
  points?: number;
  status?: number;
  isIcebox?: boolean;
  workType?: number;
  targetReleaseAt?: string;
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
    const data = await response.json();
    return data.map((item: any) => new Issue(item));
  }

  async getAllIssues(): Promise<Issue[]> {
    const response = await fetch(this.baseUrl, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch issues");
    const data = await response.json();
    return data.map((item: any) => new Issue(item));
  }

  async getIssue(id: number): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch issue");
    const data = await response.json();
    return data.map((item: any) => new Issue(item));
  }

  async updateIssue(id: number, request: UpdateIssueRequest): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update issue");
    const data = await response.json();
    return data.map((item: any) => new Issue(item));
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
