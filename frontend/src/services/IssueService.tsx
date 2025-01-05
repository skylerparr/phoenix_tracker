import { API_BASE_URL } from "../config/ApiConfig";
import { Issue } from "../models/Issue";
import { sessionStorage } from "../store/Session";
import { WebsocketService } from "../services/WebSocketService";

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
  private callbacks: ((issues: Issue[]) => void)[] = [];

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
    return new Issue(data);
  }

  subscribeToGetAllIssues(callback: (issues: Issue[]) => void): void {
    this.callbacks.push(callback);
    this.notifyCallbacks();
    if (this.callbacks.length === 1) {
      WebsocketService.subscribeToIssueCreateEvent(
        this.notifyCallbacks.bind(this),
      );
      WebsocketService.subscribeToIssueUpdatedEvent(
        this.notifyCallbacks.bind(this),
      );
      WebsocketService.subscribeToIssueDeletedEvent(
        this.notifyCallbacks.bind(this),
      );
    }
  }

  unsubscribeFromGetAllIssues(callback: (issues: Issue[]) => void): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    if (this.callbacks.length === 0) {
      WebsocketService.unsubscribeToIssueCreateEvent(
        this.notifyCallbacks.bind(this),
      );
      WebsocketService.unsubscribeToIssueUpdatedEvent(
        this.notifyCallbacks.bind(this),
      );
      WebsocketService.unsubscribeToIssueDeletedEvent(
        this.notifyCallbacks.bind(this),
      );
    }
  }

  private async notifyCallbacks(): Promise<void> {
    const response = await fetch(this.baseUrl, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch issues");
    const data = await response.json();
    const issues = data.map((item: any) => new Issue(item));
    this.callbacks.forEach((callback) => callback(issues));
  }

  async getIssue(id: number): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch issue");
    const data = await response.json();
    return new Issue(data);
  }

  async updateIssue(id: number, request: UpdateIssueRequest): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update issue");
    const data = await response.json();
    return new Issue(data);
  }
  async startIssue(id: number): Promise<Issue> {
    return this.updateIssueStatus(id, "start");
  }

  async finishIssue(id: number): Promise<Issue> {
    return this.updateIssueStatus(id, "finish");
  }
  async acceptIssue(id: number): Promise<Issue> {
    return this.updateIssueStatus(id, "accept");
  }

  async rejectIssue(id: number): Promise<Issue> {
    return this.updateIssueStatus(id, "reject");
  }

  private async updateIssueStatus(id: number, action: string): Promise<Issue> {
    const response = await fetch(`${this.baseUrl}/${id}/${action}`, {
      method: "PUT",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to ${action} issue`);
    const data = await response.json();
    return new Issue(data);
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
