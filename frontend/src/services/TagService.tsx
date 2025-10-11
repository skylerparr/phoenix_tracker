import { BaseService } from "./base/BaseService";
import { Tag } from "../models/Tag";
import { WebsocketService } from "./WebSocketService";
import { TagCacheManager, CacheKeys } from "../utils/CacheManager";

interface CreateTagRequest {
  name: string;
  isEpic: boolean;
}

interface UpdateTagRequest {
  name?: string;
  isEpic?: boolean;
}

export class TagService extends BaseService<Tag> {
  private getAllPromisesCache: ((value: Tag[]) => void)[] = [];
  private loading: boolean = false;
  private websocketSubscriptions: Set<() => Promise<void> | void> = new Set();
  private tagEventHandlers: {
    created?: (data: { tag: Tag }) => void;
    updated?: (data: { tag: Tag }) => void;
    deleted?: (data: { id: number }) => void;
  } = {};

  constructor() {
    super("/tags");
  }

  createInstance(data: any): Tag {
    return new Tag(data);
  }

  async createTag(request: CreateTagRequest): Promise<Tag> {
    const result = await this.post<Tag>("", request);
    // Proactively refresh so subscribers update immediately
    await this.refreshTagsCache();
    return result;
  }

  async getAllTags(): Promise<Tag[]> {
    const cacheKey = CacheKeys.TAGS.ALL;
    const cached = TagCacheManager.get(cacheKey);
    if (cached !== null) return cached as Tag[];

    if (this.loading) {
      return new Promise<Tag[]>((resolve) => {
        this.getAllPromisesCache.push(resolve);
      });
    }

    this.loading = true;
    const response = await fetch(this.baseUrl, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch tags");
    const data = await response.json();
    const tags = data.map((item: any) => this.createInstance(item));

    // Cache and notify subscribers
    TagCacheManager.set(cacheKey, tags);

    while (this.getAllPromisesCache.length > 0) {
      const resolve = this.getAllPromisesCache.pop();
      if (resolve) {
        resolve(tags);
      }
    }

    this.loading = false;
    return tags;
  }

  async getTag(id: number): Promise<Tag> {
    return this.get<Tag>(`/${id}`);
  }

  async updateTag(id: number, request: UpdateTagRequest): Promise<Tag> {
    const result = await this.put<Tag>(`/${id}`, request);
    await this.refreshTagsCache();
    return result;
  }

  async deleteTag(id: number): Promise<void> {
    await this.delete(`/${id}`);
    await this.refreshTagsCache();
  }

  async getTagsWithCounts(): Promise<Tag[]> {
    return this.get<Tag[]>("/counts");
  }

  subscribeToGetAllTags(callback: (tags: Tag[]) => void): void {
    const cacheKey = CacheKeys.TAGS.ALL;

    // Subscribe to cache updates
    TagCacheManager.subscribe(cacheKey, callback);

    // If cache is empty, fetch and populate
    if (!TagCacheManager.has(cacheKey)) {
      this.refreshTagsCache().catch((error) =>
        console.error("Failed to refresh tags cache:", error),
      );
    }

    // Ensure WebSocket listeners are registered once
    this.ensureWebSocketSubscriptions();
  }

  unsubscribeFromGetAllTags(callback: (tags: Tag[]) => void): void {
    const cacheKey = CacheKeys.TAGS.ALL;
    TagCacheManager.unsubscribe(cacheKey, callback);

    // If no subscribers remain, tear down WS listeners
    if (TagCacheManager.getSubscribedKeys().length === 0) {
      this.teardownWebSocketSubscriptions();
    }
  }

  private ensureWebSocketSubscriptions(): void {
    if (this.websocketSubscriptions.size > 0) return;

    // Define handlers once so we can unsubscribe properly later
    this.tagEventHandlers.created = async () => {
      await this.refreshTagsCache();
    };
    this.tagEventHandlers.updated = async () => {
      await this.refreshTagsCache();
    };
    this.tagEventHandlers.deleted = async () => {
      await this.refreshTagsCache();
    };

    WebsocketService.subscribeToTagCreatedEvent(this.tagEventHandlers.created!);
    WebsocketService.subscribeToTagUpdatedEvent(this.tagEventHandlers.updated!);
    WebsocketService.subscribeToTagDeletedEvent(this.tagEventHandlers.deleted!);

    this.websocketSubscriptions.add(async () => {
      WebsocketService.unsubscribeToTagCreatedEvent(
        this.tagEventHandlers.created!,
      );
      WebsocketService.unsubscribeToTagUpdatedEvent(
        this.tagEventHandlers.updated!,
      );
      WebsocketService.unsubscribeToTagDeletedEvent(
        this.tagEventHandlers.deleted!,
      );
    });
  }

  private teardownWebSocketSubscriptions(): void {
    this.websocketSubscriptions.forEach((unsubscribe) => {
      const result = unsubscribe();
      // Handle both sync and async unsubscribes without relying on for-of
      if (result && typeof (result as any).then === "function") {
        (result as Promise<void>).catch((e) =>
          console.error("WS unsubscribe error:", e),
        );
      }
    });
    this.websocketSubscriptions.clear();
  }

  private async refreshTagsCache(): Promise<void> {
    const cacheKey = CacheKeys.TAGS.ALL;

    // Clear cache so getAllTags will fetch from server
    TagCacheManager.clear(cacheKey);

    try {
      await this.getAllTags();
    } catch (error) {
      console.error("Failed to refresh tags cache:", error);
    }
  }
}

export const tagService = new TagService();
