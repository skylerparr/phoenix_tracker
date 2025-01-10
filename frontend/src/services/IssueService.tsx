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
  private myIssuesCallbacks: ((issues: Issue[]) => void)[] = [];
  private issuesCache: Issue[] | null = null;
  private myIssuesCache: Issue[] | null = null;

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
  private setupSubscriptions(
    isMyIssues: boolean,
    callback: (issues: Issue[]) => void,
  ): void {
    const callbacks = isMyIssues ? this.myIssuesCallbacks : this.callbacks;
    const cache = isMyIssues ? this.myIssuesCache : this.issuesCache;
    callbacks.push(callback);

    if (cache !== null) {
      callbacks.forEach((cb) => cb(cache!));
      return;
    }

    const notifyMethod = isMyIssues
      ? this.notifyMyIssuesCallbacks.bind(this)
      : this.notifyCallbacks.bind(this);

    notifyMethod();
    if (callbacks.length === 1) {
      WebsocketService.subscribeToIssueCreateEvent(notifyMethod);
      WebsocketService.subscribeToIssueUpdatedEvent(notifyMethod);
      WebsocketService.subscribeToIssueDeletedEvent(notifyMethod);
    }
  }

  private cleanupSubscriptions(
    isMyIssues: boolean,
    callback: (issues: Issue[]) => void,
  ): void {
    const callbacks = isMyIssues ? this.myIssuesCallbacks : this.callbacks;
    const notifyMethod = isMyIssues
      ? this.notifyMyIssuesCallbacks.bind(this)
      : this.notifyCallbacks.bind(this);

    if (isMyIssues) {
      this.myIssuesCallbacks = callbacks.filter((cb) => cb !== callback);
    } else {
      this.callbacks = callbacks.filter((cb) => cb !== callback);
    }

    if (callbacks.length === 0) {
      WebsocketService.unsubscribeToIssueCreateEvent(notifyMethod);
      WebsocketService.unsubscribeToIssueUpdatedEvent(notifyMethod);
      WebsocketService.unsubscribeToIssueDeletedEvent(notifyMethod);
    }
  }

  private async fetchIssues(isMyIssues: boolean): Promise<Issue[]> {
    const url = isMyIssues ? `${this.baseUrl}/me` : this.baseUrl;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(
        isMyIssues ? "Failed to fetch my issues" : "Failed to fetch issues",
      );
    }
    const data = await response.json();
    return data.map((item: any) => new Issue(item));
  }

  private async notifyCallbacks(): Promise<void> {
    this.issuesCache = await this.fetchIssues(false);
    this.callbacks.forEach((callback) => callback(this.issuesCache!));
  }

  private async notifyMyIssuesCallbacks(): Promise<void> {
    this.myIssuesCache = await this.fetchIssues(true);
    this.myIssuesCallbacks.forEach((callback) => callback(this.myIssuesCache!));
  }

  subscribeToGetAllIssues(callback: (issues: Issue[]) => void): void {
    this.setupSubscriptions(false, callback);
  }

  unsubscribeFromGetAllIssues(callback: (issues: Issue[]) => void): void {
    this.cleanupSubscriptions(false, callback);
  }

  subscribeToGetMyIssues(callback: (issues: Issue[]) => void): void {
    this.setupSubscriptions(true, callback);
  }

  unsubscribeFromGetMyIssues(callback: (issues: Issue[]) => void): void {
    this.cleanupSubscriptions(true, callback);
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

  async bulkUpdatePriorities(
    issuePriorities: [number, number][],
  ): Promise<Issue[]> {
    const response = await fetch(`${this.baseUrl}/bulk-priority`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({ issuePriorities }),
    });
    if (!response.ok) throw new Error("Failed to update issue priorities");
    const data = await response.json();
    return data.map((item: any) => new Issue(item));
  }

  async getIssuesByTag(tagId: number): Promise<Issue[]> {
    const response = await fetch(`${this.baseUrl}/tag/${tagId}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch issues by tag");
    const data = await response.json();
    return data.map((item: any) => new Issue(item));
  }

  async getAllAccepted(): Promise<Issue[]> {
    const response = await fetch(`${this.baseUrl}/accepted`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch all accepted issues");
    const data = await response.json();
    return data.map((item: any) => new Issue(item));
  }
}

export const issueService = new IssueService();
