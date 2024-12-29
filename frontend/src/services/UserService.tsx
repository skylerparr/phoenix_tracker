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
    return response.json();
  }

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(this.baseUrl, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  }

  async getUser(id: number): Promise<User> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
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
    return response.json();
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
    return response.json();
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
