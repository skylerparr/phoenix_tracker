import { WebSocketEnabledService } from "./base/WebSocketService";
import { User } from "../models/User";

interface CreateUserRequest {
  name: string;
  email: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export class UserService extends WebSocketEnabledService<User> {
  private usersCache: User[] | null = null;
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
    if (this.usersCache) return this.usersCache;
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
    this.usersCache = data.map((item: any) => this.createInstance(item));

    while (this.getAllPromisesCache.length > 0) {
      const resolve = this.getAllPromisesCache.pop();
      if (resolve) {
        resolve(this.usersCache!);
      }
    }

    this.loading = false;
    return this.usersCache!;
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
    this.getAllUsers();
  }
}

export const userService = new UserService();
