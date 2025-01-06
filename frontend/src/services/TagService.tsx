import { API_BASE_URL } from "../config/ApiConfig";
import { Tag } from "../models/Tag";
import { sessionStorage } from "../store/Session";
import { WebsocketService } from "./WebSocketService";

interface CreateTagRequest {
  name: string;
  isEpic: boolean;
}

interface UpdateTagRequest {
  name?: string;
  isEpic?: boolean;
}

export class TagService {
  private baseUrl = `${API_BASE_URL}/tags`;
  private tagsCache: Tag[] | null = null;
  private callbacks: ((tags: Tag[]) => void)[] = [];
  private getAllPromisesCache: ((value: Tag[]) => void)[] = [];
  private loading: boolean = false;

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `${sessionStorage.getSession().user?.token}`,
    };
  }

  async createTag(request: CreateTagRequest): Promise<Tag> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create tag");
    return response.json();
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
    this.tagsCache = data.map((item: any) => new Tag(item));

    while (this.getAllPromisesCache.length > 0) {
      const resolve = this.getAllPromisesCache.pop();
      if (resolve) {
        resolve(this.tagsCache!);
      }
    }

    this.loading = false;
    return this.tagsCache!;
  }

  subscribeToGetAllTags(callback: (tags: Tag[]) => void): void {
    this.callbacks.push(callback);
    if (this.loading) {
      return;
    }

    if (this.tagsCache !== null) {
      this.callbacks.forEach((callback) => callback(this.tagsCache!));
      return;
    }

    this.notifyCallbacks();
    if (this.callbacks.length === 1) {
      WebsocketService.subscribeToTagCreatedEvent(
        this.notifyCallbacks.bind(this),
      );
      WebsocketService.subscribeToTagUpdatedEvent(
        this.notifyCallbacks.bind(this),
      );
      WebsocketService.subscribeToTagDeletedEvent(
        this.notifyCallbacks.bind(this),
      );
    }
  }

  unsubscribeFromGetAllTags(callback: (tags: Tag[]) => void): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    if (this.callbacks.length === 0) {
      WebsocketService.unsubscribeToTagCreatedEvent(
        this.notifyCallbacks.bind(this),
      );
      WebsocketService.unsubscribeToTagUpdatedEvent(
        this.notifyCallbacks.bind(this),
      );
      WebsocketService.unsubscribeToTagDeletedEvent(
        this.notifyCallbacks.bind(this),
      );
    }
  }

  private async notifyCallbacks(): Promise<void> {
    await this.getAllTags();
    this.callbacks.forEach((callback) => callback(this.tagsCache!));
  }

  async getTag(id: number): Promise<Tag> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch tag");
    return response.json();
  }

  async updateTag(id: number, request: UpdateTagRequest): Promise<Tag> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update tag");
    return response.json();
  }

  async deleteTag(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete tag");
  }
}

export const tagService = new TagService();
