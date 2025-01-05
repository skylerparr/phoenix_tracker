import { API_BASE_URL } from "../config/ApiConfig";
import { sessionStorage } from "../store/Session";
import { IssueAssignee } from "../models/IssueAssignee";

interface CreateIssueAssigneeRequest {
  issueId: number;
  userId: number;
}

export class IssueAssigneeService {
  private baseUrl = `${API_BASE_URL}/issue-assignees`;

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `${sessionStorage.getSession().user?.token}`,
    };
  }

  async createIssueAssignee(
    request: CreateIssueAssigneeRequest,
  ): Promise<IssueAssignee> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create issue assignee");
    const data = await response.json();
    return new IssueAssignee(data);
  }

  async getIssueAssigneesByIssueId(issueId: number): Promise<IssueAssignee[]> {
    const response = await fetch(`${this.baseUrl}/issue/${issueId}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch issue assignees");
    const data = await response.json();
    return data.map((item: any) => new IssueAssignee(item));
  }

  async getUserAssigneesByUserId(userId: number): Promise<IssueAssignee[]> {
    const response = await fetch(`${this.baseUrl}/user/${userId}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch user assignees");
    const data = await response.json();
    return data.map((item: any) => new IssueAssignee(item));
  }

  async deleteIssueAssignee(issueId: number, userId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${issueId}/${userId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete issue assignee");
  }
}

export const issueAssigneeService = new IssueAssigneeService();
