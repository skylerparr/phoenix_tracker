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
  private refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isRefreshing: boolean = false;

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
      const handleIssueCreated = (issue: Issue) => {
        console.log('WebSocket: Issue created', issue);
        this.debouncedRefreshAllCacheData();
      };

      const handleIssueUpdated = (issue: Issue) => {
        console.log('WebSocket: Issue updated', issue);
        this.debouncedRefreshAllCacheData();
      };

      const handleIssueDeleted = (data: { id: number }) => {
        console.log('WebSocket: Issue deleted', data);
        this.debouncedRefreshAllCacheData();
      };

      WebsocketService.subscribeToIssueCreateEvent(handleIssueCreated);
      WebsocketService.subscribeToIssueUpdatedEvent(handleIssueUpdated);
      WebsocketService.subscribeToIssueDeletedEvent(handleIssueDeleted);

      this.websocketSubscriptions.add(async () => {
        WebsocketService.unsubscribeToIssueCreateEvent(handleIssueCreated);
        WebsocketService.unsubscribeToIssueUpdatedEvent(handleIssueUpdated);
        WebsocketService.unsubscribeToIssueDeletedEvent(handleIssueDeleted);
      });
    }
  }

  private debouncedRefreshAllCacheData(): void {
    // Clear any existing timeout
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }

    // If already refreshing, skip this request
    if (this.isRefreshing) {
      console.log('Cache refresh already in progress, skipping...');
      return;
    }

    // Set a timeout to refresh after 500ms of no new requests
    this.refreshTimeoutId = setTimeout(() => {
      this.refreshAllCacheData().catch(error => {
        console.error('Failed to refresh cache data:', error);
      });
    }, 500);
  }

  private async refreshAllCacheData(): Promise<void> {
    if (this.isRefreshing) {
      console.log('Cache refresh already in progress, aborting...');
      return;
    }

    this.isRefreshing = true;
    console.log('Starting cache refresh...');

    try {
      const subscribedKeys = IssueCacheManager.getSubscribedKeys();
      console.log('Refreshing subscribed cache keys:', subscribedKeys);

      if (subscribedKeys.length === 0) {
        console.log('No active subscriptions, skipping cache refresh');
        return;
      }

      const refreshPromises = [];

      for (const key of subscribedKeys) {
        if (key === CacheKeys.ISSUES.ALL) {
          refreshPromises.push(this.refreshCacheData(key, () => this.fetchIssues(false)));
        } else if (key === CacheKeys.ISSUES.MY_ISSUES) {
          refreshPromises.push(this.refreshCacheData(key, () => this.fetchIssues(true)));
        } else if (key === CacheKeys.ISSUES.ACCEPTED) {
          refreshPromises.push(this.refreshCacheData(key, () => this.get<Issue[]>("/accepted")));
        } else if (key === CacheKeys.ISSUES.ICEBOX) {
          refreshPromises.push(this.refreshCacheData(key, () => this.get<Issue[]>("/icebox")));
        } else if (key.startsWith('issues:tag:')) {
          // Extract tag ID from cache key like "issues:tag:123"
          const tagId = parseInt(key.split(':')[2]);
          if (!isNaN(tagId)) {
            refreshPromises.push(this.refreshCacheData(key, () => this.get<Issue[]>(`/tag/${tagId}`)));
          }
        } else if (key.startsWith('issues:user:')) {
          // Extract user ID from cache key like "issues:user:456"
          const userId = parseInt(key.split(':')[2]);
          if (!isNaN(userId)) {
            refreshPromises.push(this.refreshCacheData(key, () => this.get<Issue[]>(`/user/${userId}`)));
          }
        }
      }

      // Wait for all cache refreshes to complete
      await Promise.all(refreshPromises);
      console.log(`Cache refresh completed successfully for ${refreshPromises.length} subscriptions`);
    } catch (error) {
      console.error('Error during cache refresh:', error);
    } finally {
      this.isRefreshing = false;
      this.refreshTimeoutId = null;
    }
  }

  private invalidateAllCaches(): void {
    IssueCacheManager.clearAll();
  }

  // Cleanup method
  async destroy(): Promise<void> {
    // Unsubscribe from all WebSocket events using stored references
    const unsubscribeFunctions = Array.from(this.websocketSubscriptions);
    for (const unsubscribe of unsubscribeFunctions) {
      await unsubscribe();
    }

    this.websocketSubscriptions.clear();
    this.clearCaches();
  }
}

export const issueService = new IssueService();
