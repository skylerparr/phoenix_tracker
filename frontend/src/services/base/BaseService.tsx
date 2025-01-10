import { API_BASE_URL } from "../../config/ApiConfig";
import { sessionStorage } from "../../store/Session";

export abstract class BaseService<R> {
  protected constructor(protected baseUrl: string) {
    this.baseUrl = `${API_BASE_URL}${baseUrl}`;
  }

  protected abstract createInstance(data: any): R;

  protected getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `${sessionStorage.getSession().user?.token}`,
    };
  }

  protected async get<T extends R | R[]>(endpoint: string = ""): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch from ${endpoint}`);
    const data = await response.json();
    return Array.isArray(data)
      ? (data.map((item) => this.createInstance(item)) as T)
      : (this.createInstance(data) as T);
  }

  protected async post<T extends R | R[]>(
    endpoint: string = "",
    body?: any,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Failed to post to ${endpoint}`);
    const data = await response.json();
    return Array.isArray(data)
      ? (data.map((item) => this.createInstance(item)) as T)
      : (this.createInstance(data) as T);
  }

  protected async put<T extends R | R[]>(
    endpoint: string = "",
    body?: any,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Failed to update at ${endpoint}`);
    const data = await response.json();
    return Array.isArray(data)
      ? (data.map((item) => this.createInstance(item)) as T)
      : (this.createInstance(data) as T);
  }

  protected async delete(endpoint: string = ""): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to delete at ${endpoint}`);
  }
}
