import { WebSocketEnabledService } from "./base/WebSocketService";
import { IssueAssignee } from "../models/IssueAssignee";

interface CreateIssueAssigneeRequest {
  issueId: number;
  userId: number;
}

export class IssueAssigneeService extends WebSocketEnabledService<IssueAssignee> {
  private issueAssigneesCache: Map<number, IssueAssignee[]> = new Map();
  private getAllPromisesCache: Map<
    number,
    ((value: IssueAssignee[]) => void)[]
  > = new Map();
  private loadingIssues: Set<number> = new Set();

  constructor() {
    super("/issue-assignees");
  }

  protected createInstance(data: any): IssueAssignee {
    return new IssueAssignee(data);
  }

  async createIssueAssignee(
    request: CreateIssueAssigneeRequest,
  ): Promise<IssueAssignee> {
    return this.post<IssueAssignee>("", request);
  }

  async getIssueAssigneesByIssueId(issueId: number): Promise<IssueAssignee[]> {
    if (this.issueAssigneesCache.has(issueId))
      return this.issueAssigneesCache.get(issueId)!;
    if (this.loadingIssues.has(issueId)) {
      return new Promise<IssueAssignee[]>((resolve) => {
        if (!this.getAllPromisesCache.has(issueId)) {
          this.getAllPromisesCache.set(issueId, []);
        }
        this.getAllPromisesCache.get(issueId)!.push(resolve);
      });
    }

    this.loadingIssues.add(issueId);
    const response = await fetch(`${this.baseUrl}/issue/${issueId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch issue assignees");
    const data = await response.json();
    const assignees = data.map((item: any) => this.createInstance(item));
    this.issueAssigneesCache.set(issueId, assignees);

    if (this.getAllPromisesCache.has(issueId)) {
      const promises = this.getAllPromisesCache.get(issueId)!;
      while (promises.length > 0) {
        const resolve = promises.pop();
        if (resolve) {
          resolve(assignees);
        }
      }
      this.getAllPromisesCache.delete(issueId);
    }

    this.loadingIssues.delete(issueId);
    return assignees;
  }

  async getUserAssigneesByUserId(userId: number): Promise<IssueAssignee[]> {
    return this.get<IssueAssignee[]>(`/user/${userId}`);
  }

  async deleteIssueAssignee(issueId: number, userId: number): Promise<void> {
    return this.delete(`/${issueId}/${userId}`);
  }

  subscribeToGetAllIssueAssignees(callback: () => void): void {
    this.subscribe(callback, this.notifyCallbacks.bind(this));
    this.setupWebSocketSubscription(this.notifyCallbacks.bind(this), [
      "IssueAssigneeCreatedEvent",
      "IssueAssigneeUpdatedEvent",
      "IssueAssigneeDeletedEvent",
    ]);
  }

  unsubscribeFromGetAllIssueAssignees(callback: () => void): void {
    this.unsubscribe(callback);
    this.cleanupWebSocketSubscription(this.notifyCallbacks.bind(this), [
      "IssueAssigneeCreatedEvent",
      "IssueAssigneeUpdatedEvent",
      "IssueAssigneeDeletedEvent",
    ]);
  }

  private async notifyCallbacks(): Promise<void> {
    this.issueAssigneesCache.clear();
    for (const callback of this.callbacks) {
      callback([]);
    }
  }
}

export const issueAssigneeService = new IssueAssigneeService();
