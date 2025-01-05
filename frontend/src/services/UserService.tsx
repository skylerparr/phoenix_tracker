import { API_BASE_URL } from "../config/ApiConfig";
import { User } from "../models/User";
import { sessionStorage } from "../store/Session";

interface CreateUserRequest {
  name: string;
  email: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export class UserService {
  private baseUrl = `${API_BASE_URL}/users`;

  async createUser(request: CreateUserRequest): Promise<User> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create user");
    const data = await response.json();
    return new User(data);
  }

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(this.baseUrl, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch users");
    const data = await response.json();
    return data.map((item: any) => new User(item));
  }

  async getUser(id: number): Promise<User> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch user");
    const data = await response.json();
    return new User(data);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const response = await fetch(
      `${this.baseUrl}/by-email?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `${sessionStorage.getSession().user?.token}`,
        },
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Failed to fetch user by email");
    const data = await response.json();
    return data ? new User(data) : null;
  }

  async updateUser(id: number, request: UpdateUserRequest): Promise<User> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update user");
    const data = await response.json();
    return new User(data);
  }

  async deleteUser(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to delete user");
  }
}

export const userService = new UserService();
