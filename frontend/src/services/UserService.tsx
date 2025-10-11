import { BaseService } from "./base/BaseService";
import { User } from "../models/User";
import { WebsocketService } from "./WebSocketService";
import { UserCacheManager, CacheKeys } from "../utils/CacheManager";

interface CreateUserRequest {
  name: string;
  email: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export class UserService extends BaseService<User> {
  private getAllPromisesCache: ((value: User[]) => void)[] = [];
  private loading: boolean = false;
  private websocketSubscriptions: Set<() => Promise<void> | void> = new Set();
  private userEventHandlers: {
    created?: (data: { user: User }) => void;
    updated?: (data: { user: User }) => void;
    deleted?: (data: { id: number }) => void;
  } = {};

  constructor() {
    super("/users");
  }

  createInstance(data: any): User {
    return new User(data);
  }

  async createUser(request: CreateUserRequest): Promise<User> {
    const result = await this.post<User>("", request);
    await this.refreshUsersCache();
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    const cacheKey = CacheKeys.USERS.ALL;
    const cached = UserCacheManager.get(cacheKey);
    if (cached !== null) return cached as User[];

    if (this.loading) {
      return new Promise<User[]>((resolve) => {
        this.getAllPromisesCache.push(resolve);
      });
    }

    this.loading = true;
    const response = await fetch(this.baseUrl, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch users");
    const data = await response.json();
    const users = data.map((item: any) => this.createInstance(item));
    UserCacheManager.set(cacheKey, users);

    while (this.getAllPromisesCache.length > 0) {
      const resolve = this.getAllPromisesCache.pop();
      if (resolve) {
        resolve(users);
      }
    }

    this.loading = false;
    return users;
  }

  async getUser(id: number): Promise<User> {
    return this.get<User>(`/${id}`);
  }

  async getUserByEmail(email: string): Promise<User> {
    return this.get<User>(`/by-email?email=${encodeURIComponent(email)}`);
  }

  async updateUser(id: number, request: UpdateUserRequest): Promise<User> {
    const result = await this.put<User>(`/${id}`, request);
    await this.refreshUsersCache();
    return result;
  }

  async deleteUser(id: number): Promise<void> {
    await this.delete(`/${id}`);
    await this.refreshUsersCache();
  }

  async inviteUser(email: string): Promise<User> {
    const result = await this.post<User>("/invite", { email });
    await this.refreshUsersCache();
    return result;
  }
  async removeUser(id: number): Promise<void> {
    await this.delete(`/${id}/remove`);
    await this.refreshUsersCache();
  }

  subscribeToGetAllUsers(callback: (users: User[]) => void): void {
    const cacheKey = CacheKeys.USERS.ALL;
    UserCacheManager.subscribe(cacheKey, callback);

    if (!UserCacheManager.has(cacheKey)) {
      this.refreshUsersCache().catch((e) =>
        console.error("Failed to refresh users cache:", e),
      );
    }

    this.ensureWebSocketSubscriptions();
  }

  unsubscribeFromGetAllUsers(callback: (users: User[]) => void): void {
    const cacheKey = CacheKeys.USERS.ALL;
    UserCacheManager.unsubscribe(cacheKey, callback);

    if (UserCacheManager.getSubscribedKeys().length === 0) {
      this.teardownWebSocketSubscriptions();
    }
  }

  private ensureWebSocketSubscriptions(): void {
    if (this.websocketSubscriptions.size > 0) return;

    this.userEventHandlers.created = async () => {
      await this.refreshUsersCache();
    };
    this.userEventHandlers.updated = async () => {
      await this.refreshUsersCache();
    };
    this.userEventHandlers.deleted = async () => {
      await this.refreshUsersCache();
    };

    WebsocketService.subscribeToUserCreatedEvent(
      this.userEventHandlers.created!,
    );
    WebsocketService.subscribeToUserUpdatedEvent(
      this.userEventHandlers.updated!,
    );
    WebsocketService.subscribeToUserDeletedEvent(
      this.userEventHandlers.deleted!,
    );

    this.websocketSubscriptions.add(async () => {
      WebsocketService.unsubscribeToUserCreatedEvent(
        this.userEventHandlers.created!,
      );
      WebsocketService.unsubscribeToUserUpdatedEvent(
        this.userEventHandlers.updated!,
      );
      WebsocketService.unsubscribeToUserDeletedEvent(
        this.userEventHandlers.deleted!,
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

  private async refreshUsersCache(): Promise<void> {
    const cacheKey = CacheKeys.USERS.ALL;
    UserCacheManager.clear(cacheKey);
    try {
      await this.getAllUsers();
    } catch (error) {
      console.error("Failed to refresh users cache:", error);
    }
  }
}

export const userService = new UserService();
