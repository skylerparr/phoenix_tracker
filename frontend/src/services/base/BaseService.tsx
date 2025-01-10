import { API_BASE_URL } from "../../config/ApiConfig";
import { sessionStorage } from "../../store/Session";

export abstract class BaseService<T> {
  protected constructor(protected baseUrl: string) {
    this.baseUrl = `${API_BASE_URL}${baseUrl}`;
  }

  protected getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `${sessionStorage.getSession().user?.token}`,
    };
  }

  protected async get<R>(endpoint: string = ""): Promise<R> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch from ${endpoint}`);
    return response.json();
  }

  protected async post<R>(endpoint: string = "", body?: any): Promise<R> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Failed to post to ${endpoint}`);
    return response.json();
  }

  protected async put<R>(endpoint: string = "", body?: any): Promise<R> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Failed to update at ${endpoint}`);
    return response.json();
  }

  protected async delete(endpoint: string = ""): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to delete at ${endpoint}`);
  }
}
