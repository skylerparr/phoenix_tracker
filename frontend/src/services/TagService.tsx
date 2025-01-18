import { WebSocketEnabledService } from "./base/WebSocketService";
import { Tag } from "../models/Tag";

interface CreateTagRequest {
  name: string;
  isEpic: boolean;
}

interface UpdateTagRequest {
  name?: string;
  isEpic?: boolean;
}

export class TagService extends WebSocketEnabledService<Tag> {
  private tagsCache: Tag[] | null = null;
  private getAllPromisesCache: ((value: Tag[]) => void)[] = [];
  private loading: boolean = false;

  constructor() {
    super("/tags");
  }

  createInstance(data: any): Tag {
    return new Tag(data);
  }

  async createTag(request: CreateTagRequest): Promise<Tag> {
    return this.post<Tag>("", request);
  }

  async getAllTags(): Promise<Tag[]> {
    if (this.tagsCache) return this.tagsCache;
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
    this.tagsCache = data.map((item: any) => this.createInstance(item));

    while (this.getAllPromisesCache.length > 0) {
      const resolve = this.getAllPromisesCache.pop();
      if (resolve) {
        resolve(this.tagsCache!);
      }
    }

    this.loading = false;
    return this.tagsCache!;
  }

  async getTag(id: number): Promise<Tag> {
    return this.get<Tag>(`/${id}`);
  }

  async updateTag(id: number, request: UpdateTagRequest): Promise<Tag> {
    return this.put<Tag>(`/${id}`, request);
  }

  async deleteTag(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async getTagsWithCounts(): Promise<Tag[]> {
    return this.get<Tag[]>("/counts");
  }

  subscribeToGetAllTags(callback: (tags: Tag[]) => void): void {
    this.subscribe(callback, this.notifyCallbacks.bind(this));
    this.setupWebSocketSubscription(this.notifyCallbacks.bind(this), [
      "TagCreatedEvent",
      "TagUpdatedEvent",
      "TagDeletedEvent",
    ]);
  }

  unsubscribeFromGetAllTags(callback: (tags: Tag[]) => void): void {
    this.unsubscribe(callback);
    this.cleanupWebSocketSubscription(this.notifyCallbacks.bind(this), [
      "TagCreatedEvent",
      "TagUpdatedEvent",
      "TagDeletedEvent",
    ]);
  }

  private async notifyCallbacks(): Promise<void> {
    this.getAllTags();
  }
}

export const tagService = new TagService();
