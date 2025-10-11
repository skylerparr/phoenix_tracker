import { BaseService } from "./base/BaseService";
import { IssueAssignee } from "../models/IssueAssignee";
import { WebsocketService } from "./WebSocketService";
import { IssueAssigneeCacheManager, CacheKeys } from "../utils/CacheManager";

interface CreateIssueAssigneeRequest {
  issueId: number;
  userId: number;
}

export class IssueAssigneeService extends BaseService<IssueAssignee> {
  private getAllPromisesCache: Map<
    number,
    ((value: IssueAssignee[]) => void)[]
  > = new Map();
  private loadingIssues: Set<number> = new Set();
  private globalSubscribers: Set<(assignees?: IssueAssignee[]) => void> =
    new Set();
  private websocketSubscriptions: Set<() => Promise<void> | void> = new Set();
  private eventHandlers: {
    created?: (data: { issueAssignee: IssueAssignee }) => void;
    updated?: (data: { issueAssignee: IssueAssignee }) => void;
    deleted?: (data: { id: number }) => void;
  } = {};

  constructor() {
    super("/issue-assignees");
  }

  protected createInstance(data: any): IssueAssignee {
    return new IssueAssignee(data);
  }

  async createIssueAssignee(
    request: CreateIssueAssigneeRequest,
  ): Promise<IssueAssignee> {
    const result = await this.post<IssueAssignee>("", request);
    await this.refreshCacheForIssue(request.issueId);
    this.notifyGlobalSubscribers();
    return result;
  }

  async getIssueAssigneesByIssueId(issueId: number): Promise<IssueAssignee[]> {
    const cacheKey = CacheKeys.ASSIGNEES.BY_ISSUE(issueId);
    const cached = IssueAssigneeCacheManager.get(cacheKey);
    if (cached !== null) return cached as IssueAssignee[];

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

    IssueAssigneeCacheManager.set(cacheKey, assignees);

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
    await this.delete(`/${issueId}/${userId}`);
    await this.refreshCacheForIssue(issueId);
    this.notifyGlobalSubscribers();
  }

  // Global subscription (no specific issueId); invokes callbacks on any change
  subscribeToGetAllIssueAssignees(
    callback: (assignees?: IssueAssignee[]) => void,
  ): void {
    this.globalSubscribers.add(callback);
    this.ensureWebSocketSubscriptions();
  }

  unsubscribeFromGetAllIssueAssignees(
    callback: (assignees?: IssueAssignee[]) => void,
  ): void {
    this.globalSubscribers.delete(callback);
    if (this.globalSubscribers.size === 0) {
      this.teardownWebSocketSubscriptions();
    }
  }

  // Fine-grained subscription per issueId
  subscribeToIssueAssigneesByIssueId(
    issueId: number,
    callback: (assignees: IssueAssignee[]) => void,
  ): void {
    const key = CacheKeys.ASSIGNEES.BY_ISSUE(issueId);
    IssueAssigneeCacheManager.subscribe(key, callback);
    if (!IssueAssigneeCacheManager.has(key)) {
      this.refreshCacheForIssue(issueId).catch((e) =>
        console.error("Failed to refresh assignees cache:", e),
      );
    }
    this.ensureWebSocketSubscriptions();
  }

  unsubscribeFromIssueAssigneesByIssueId(
    issueId: number,
    callback: (assignees: IssueAssignee[]) => void,
  ): void {
    const key = CacheKeys.ASSIGNEES.BY_ISSUE(issueId);
    IssueAssigneeCacheManager.unsubscribe(key, callback);
    if (
      this.globalSubscribers.size === 0 &&
      IssueAssigneeCacheManager.getSubscribedKeys().length === 0
    ) {
      this.teardownWebSocketSubscriptions();
    }
  }

  private async refreshCacheForIssue(issueId: number): Promise<void> {
    const key = CacheKeys.ASSIGNEES.BY_ISSUE(issueId);
    IssueAssigneeCacheManager.clear(key);
    try {
      await this.getIssueAssigneesByIssueId(issueId);
    } catch (error) {
      console.error("Failed to refresh assignees cache:", error);
    }
  }

  private notifyGlobalSubscribers(assignees?: IssueAssignee[]): void {
    this.globalSubscribers.forEach((cb) => {
      try {
        cb(assignees);
      } catch (e) {
        console.error("Error invoking assignee subscriber:", e);
      }
    });
  }

  private ensureWebSocketSubscriptions(): void {
    if (this.websocketSubscriptions.size > 0) return;

    this.eventHandlers.created = async (data) => {
      const issueId = data.issueAssignee.issueId;
      await this.refreshCacheForIssue(issueId);
      this.notifyGlobalSubscribers();
    };
    this.eventHandlers.updated = async (data) => {
      const issueId = data.issueAssignee.issueId;
      await this.refreshCacheForIssue(issueId);
      this.notifyGlobalSubscribers();
    };
    this.eventHandlers.deleted = async () => {
      // Unknown issueId on delete event payload; clear all caches
      IssueAssigneeCacheManager.clearAll();
      this.notifyGlobalSubscribers();
    };

    WebsocketService.subscribeToIssueAssigneeCreatedEvent(
      this.eventHandlers.created!,
    );
    WebsocketService.subscribeToIssueAssigneeUpdatedEvent(
      this.eventHandlers.updated!,
    );
    WebsocketService.subscribeToIssueAssigneeDeletedEvent(
      this.eventHandlers.deleted!,
    );

    this.websocketSubscriptions.add(async () => {
      WebsocketService.unsubscribeToIssueAssigneeCreatedEvent(
        this.eventHandlers.created!,
      );
      WebsocketService.unsubscribeToIssueAssigneeUpdatedEvent(
        this.eventHandlers.updated!,
      );
      WebsocketService.unsubscribeToIssueAssigneeDeletedEvent(
        this.eventHandlers.deleted!,
      );
    });
  }

  private teardownWebSocketSubscriptions(): void {
    this.websocketSubscriptions.forEach((unsubscribe) => {
      const result = unsubscribe();
      if (result && typeof (result as any).then === "function") {
        (result as Promise<void>).catch((e) =>
          console.error("WS unsubscribe error:", e),
        );
      }
    });
    this.websocketSubscriptions.clear();
  }
}

export const issueAssigneeService = new IssueAssigneeService();
