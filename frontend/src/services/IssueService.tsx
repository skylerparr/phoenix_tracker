import { BaseService } from "./base/BaseService";
import { Issue } from "../models/Issue";
import { WebsocketService } from "./WebSocketService";
import { IssueCacheManager, CacheKeys } from "../utils/CacheManager";

interface CreateIssueRequest {
  title: string;
  description?: string;
  priority: number;
  points?: number | null;
  status: number;
  isIcebox: boolean;
  workType: number;
  targetReleaseAt?: Date | null;
}

interface UpdateIssueRequest {
  title?: string;
  description?: string;
  priority?: number;
  points?: number | null;
  status?: number;
  isIcebox?: boolean;
  workType?: number;
  targetReleaseAt?: Date | null;
}

/**
 * Issue Service using centralized cache management
 * Cleaner separation of concerns and better maintainability
 */
export class IssueService extends BaseService<Issue> {
  private websocketSubscriptions: Set<() => Promise<void>> = new Set();

  constructor() {
    super("/issues");
  }

  protected createInstance(data: any): Issue {
    return new Issue(data);
  }

  // CRUD Operations
  async createIssue(request: CreateIssueRequest): Promise<Issue> {
    const result = await this.post<Issue>("", request);
    this.invalidateAllCaches();
    return result;
  }

  async getIssue(id: number): Promise<Issue> {
    return this.get<Issue>(`/${id}`);
  }

  async updateIssue(id: number, request: UpdateIssueRequest): Promise<Issue> {
    const result = await this.put<Issue>(`/${id}`, request);
    this.invalidateAllCaches();
    return result;
  }

  async deleteIssue(id: number): Promise<void> {
    await this.delete(`/${id}`);
    this.invalidateAllCaches();
  }

  // Issue State Changes
  async startIssue(id: number): Promise<Issue> {
    const result = await this.put<Issue>(`/${id}/start`);
    this.invalidateAllCaches();
    return result;
  }

  async finishIssue(id: number): Promise<Issue> {
    const result = await this.put<Issue>(`/${id}/finish`);
    this.invalidateAllCaches();
    return result;
  }

  async deliverIssue(id: number): Promise<Issue> {
    const result = await this.put<Issue>(`/${id}/deliver`);
    this.invalidateAllCaches();
    return result;
  }

  async acceptIssue(id: number): Promise<Issue> {
    const result = await this.put<Issue>(`/${id}/accept`);
    this.invalidateAllCaches();
    return result;
  }

  async rejectIssue(id: number): Promise<Issue> {
    const result = await this.put<Issue>(`/${id}/reject`);
    this.invalidateAllCaches();
    return result;
  }

  async bulkUpdatePriorities(
    issuePriorities: [number, number][],
  ): Promise<Issue[]> {
    const result = await this.put<Issue[]>("/bulk-priority", {
      issuePriorities,
    });
    this.invalidateAllCaches();
    return result;
  }

  // Data Retrieval Methods
  async getAllIssues(): Promise<Issue[]> {
    return this.getCachedData(CacheKeys.ISSUES.ALL, () =>
      this.fetchIssues(false),
    );
  }

  async getMyIssues(): Promise<Issue[]> {
    return this.getCachedData(CacheKeys.ISSUES.MY_ISSUES, () =>
      this.fetchIssues(true),
    );
  }

  async getIssuesByTag(tagId: number): Promise<Issue[]> {
    const cacheKey = CacheKeys.ISSUES.BY_TAG(tagId);
    return this.getCachedData(cacheKey, () =>
      this.get<Issue[]>(`/tag/${tagId}`),
    );
  }

  async getIssuesByUser(userId: number): Promise<Issue[]> {
    const cacheKey = CacheKeys.ISSUES.BY_USER(userId);
    return this.getCachedData(cacheKey, () =>
      this.get<Issue[]>(`/user/${userId}`),
    );
  }

  async getAllAccepted(): Promise<Issue[]> {
    return this.getCachedData(CacheKeys.ISSUES.ACCEPTED, () =>
      this.get<Issue[]>("/accepted"),
    );
  }

  async getAllIcebox(): Promise<Issue[]> {
    return this.getCachedData(CacheKeys.ISSUES.ICEBOX, () =>
      this.get<Issue[]>("/icebox"),
    );
  }

  async getWeeklyPointsAverage(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/weekly-points-average`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch weekly points average");
    return response.json();
  }

  // Subscription Methods - Maintaining backward compatibility
  subscribeToGetAllIssues(callback: (issues: Issue[]) => void): void {
    this.setupSubscription(CacheKeys.ISSUES.ALL, callback, () =>
      this.fetchIssues(false),
    );
  }

  unsubscribeFromGetAllIssues(callback: (issues: Issue[]) => void): void {
    IssueCacheManager.unsubscribe(CacheKeys.ISSUES.ALL, callback);
  }

  subscribeToGetMyIssues(callback: (issues: Issue[]) => void): void {
    this.setupSubscription(CacheKeys.ISSUES.MY_ISSUES, callback, () =>
      this.fetchIssues(true),
    );
  }

  unsubscribeFromGetMyIssues(callback: (issues: Issue[]) => void): void {
    IssueCacheManager.unsubscribe(CacheKeys.ISSUES.MY_ISSUES, callback);
  }

  // Cache Management
  clearCaches(): void {
    IssueCacheManager.clearAll();
  }

  // Private Helper Methods
  private async fetchIssues(isMyIssues: boolean): Promise<Issue[]> {
    return this.get<Issue[]>(isMyIssues ? "/me" : "");
  }

  private async getCachedData<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = IssueCacheManager.get(cacheKey);
    if (cached !== null) {
      return cached as T;
    }

    const data = await fetcher();
    IssueCacheManager.set(cacheKey, data as any);
    return data;
  }

  private setupSubscription(
    cacheKey: string,
    callback: (issues: Issue[]) => void,
    fetcher: () => Promise<Issue[]>,
  ): void {
    // Subscribe to cache updates
    IssueCacheManager.subscribe(cacheKey, callback);

    // If no data in cache, fetch it
    if (!IssueCacheManager.has(cacheKey)) {
      this.refreshCacheData(cacheKey, fetcher);
    }

    // Setup WebSocket subscriptions only once
    this.ensureWebSocketSubscriptions();
  }

  private async refreshCacheData(
    cacheKey: string,
    fetcher: () => Promise<Issue[]>,
  ): Promise<void> {
    try {
      const data = await fetcher();
      IssueCacheManager.set(cacheKey, data);
    } catch (error) {
      console.error(`Failed to refresh cache for ${cacheKey}:`, error);
    }
  }

  private ensureWebSocketSubscriptions(): void {
    if (this.websocketSubscriptions.size === 0) {
      const refreshAllData = this.refreshAllCacheData.bind(this);

      WebsocketService.subscribeToIssueCreateEvent(refreshAllData);
      WebsocketService.subscribeToIssueUpdatedEvent(refreshAllData);
      WebsocketService.subscribeToIssueDeletedEvent(refreshAllData);

      this.websocketSubscriptions.add(refreshAllData);
    }
  }

  private async refreshAllCacheData(): Promise<void> {
    const cacheKeys = IssueCacheManager.getKeys();

    for (const key of cacheKeys) {
      if (key === CacheKeys.ISSUES.ALL) {
        await this.refreshCacheData(key, () => this.fetchIssues(false));
      } else if (key === CacheKeys.ISSUES.MY_ISSUES) {
        await this.refreshCacheData(key, () => this.fetchIssues(true));
      } else if (key === CacheKeys.ISSUES.ACCEPTED) {
        await this.refreshCacheData(key, () => this.get<Issue[]>("/accepted"));
      } else if (key === CacheKeys.ISSUES.ICEBOX) {
        await this.refreshCacheData(key, () => this.get<Issue[]>("/icebox"));
      }
      // Add more cache refresh logic as needed
    }
  }

  private invalidateAllCaches(): void {
    IssueCacheManager.clearAll();
  }

  // Cleanup method
  destroy(): void {
    // Unsubscribe from all WebSocket events
    const refreshAllData = this.refreshAllCacheData.bind(this);
    WebsocketService.unsubscribeToIssueCreateEvent(refreshAllData);
    WebsocketService.unsubscribeToIssueUpdatedEvent(refreshAllData);
    WebsocketService.unsubscribeToIssueDeletedEvent(refreshAllData);

    this.websocketSubscriptions.clear();
    this.clearCaches();
  }
}

export const issueService = new IssueService();
