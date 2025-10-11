import { WebSocketEnabledService } from "./base/WebSocketService";
import { User } from "../models/User";
import { UserCacheManager, CacheKeys } from "../utils/CacheManager";

interface CreateUserRequest {
  name: string;
  email: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export class UserService extends WebSocketEnabledService<User> {
  private getAllPromisesCache: ((value: User[]) => void)[] = [];
  private loading: boolean = false;

  constructor() {
    super("/users");
  }

  createInstance(data: any): User {
    return new User(data);
  }

  async createUser(request: CreateUserRequest): Promise<User> {
    return this.post<User>("", request);
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
    return this.put<User>(`/${id}`, request);
  }

  async deleteUser(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async inviteUser(email: string): Promise<User> {
    return this.post<User>("/invite", { email });
  }
  async removeUser(id: number): Promise<void> {
    return this.delete(`/${id}/remove`);
  }

  subscribeToGetAllUsers(callback: (users: User[]) => void): void {
    this.subscribe(callback, this.notifyCallbacks.bind(this));
    this.setupWebSocketSubscription(this.notifyCallbacks.bind(this), [
      "UserCreatedEvent",
      "UserUpdatedEvent",
      "UserDeletedEvent",
    ]);
  }

  unsubscribeFromGetAllUsers(callback: (users: User[]) => void): void {
    this.unsubscribe(callback);
    this.cleanupWebSocketSubscription(this.notifyCallbacks.bind(this), [
      "UserCreatedEvent",
      "UserUpdatedEvent",
      "UserDeletedEvent",
    ]);
  }

  private async notifyCallbacks(): Promise<void> {
    // Invalidate cache and refetch
    UserCacheManager.clear(CacheKeys.USERS.ALL);
    const data = await this.getAllUsers();
    for (const callback of this.callbacks) {
      callback(data);
    }
  }
}

export const userService = new UserService();
