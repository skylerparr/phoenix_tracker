import { BaseService } from "./base/BaseService";
import { Issue } from "../models/Issue";
import { WebsocketService } from "./WebSocketService";

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
  points?: number | null;
  status?: number;
  isIcebox?: boolean;
  workType?: number;
  targetReleaseAt?: string;
}

export class IssueService extends BaseService<Issue> {
  private callbacks: ((issues: Issue[]) => void)[] = [];
  private myIssuesCallbacks: ((issues: Issue[]) => void)[] = [];
  private issuesCache: Issue[] | null = null;
  private myIssuesCache: Issue[] | null = null;

  constructor() {
    super("/issues");
  }

  protected createInstance(data: any): Issue {
    return new Issue(data);
  }

  async createIssue(request: CreateIssueRequest): Promise<Issue> {
    return this.post<Issue>("", request);
  }

  async getIssue(id: number): Promise<Issue> {
    return this.get<Issue>(`/${id}`);
  }

  async updateIssue(id: number, request: UpdateIssueRequest): Promise<Issue> {
    return this.put<Issue>(`/${id}`, request);
  }

  async deleteIssue(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async startIssue(id: number): Promise<Issue> {
    return this.put<Issue>(`/${id}/start`);
  }

  async finishIssue(id: number): Promise<Issue> {
    return this.put<Issue>(`/${id}/finish`);
  }

  async acceptIssue(id: number): Promise<Issue> {
    return this.put<Issue>(`/${id}/accept`);
  }

  async rejectIssue(id: number): Promise<Issue> {
    return this.put<Issue>(`/${id}/reject`);
  }

  async bulkUpdatePriorities(
    issuePriorities: [number, number][],
  ): Promise<Issue[]> {
    return this.put<Issue[]>("/bulk-priority", { issuePriorities });
  }

  async getIssuesByTag(tagId: number): Promise<Issue[]> {
    return this.get<Issue[]>(`/tag/${tagId}`);
  }

  async getAllAccepted(): Promise<Issue[]> {
    return this.get<Issue[]>("/accepted");
  }

  async getAllIcebox(): Promise<Issue[]> {
    return this.get<Issue[]>("/icebox");
  }

  private async fetchIssues(isMyIssues: boolean): Promise<Issue[]> {
    return this.get<Issue[]>(isMyIssues ? "/me" : "");
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
  async getWeeklyPointsAverage(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/weekly-points-average`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch weekly points average");
    return response.json();
  }

  async getIssuesByUser(userId: number): Promise<Issue[]> {
    return this.get<Issue[]>(`/user/${userId}`);
  }
}

export const issueService = new IssueService();
