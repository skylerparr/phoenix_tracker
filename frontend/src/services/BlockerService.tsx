import { API_BASE_URL } from "../config/ApiConfig";
import { sessionStorage } from "../store/Session";
import { Blocker } from "../models/Blocker";

interface CreateBlockerRequest {
  blockerId: number;
  blockedId: number;
}

export class BlockerService {
  private baseUrl = `${API_BASE_URL}/blockers`;

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `${sessionStorage.getSession().user?.token}`,
    };
  }

  async createBlocker(request: CreateBlockerRequest): Promise<Blocker> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create blocker");
    const data = await response.json();
    return new Blocker(data);
  }

  async getBlockerIssues(blockerId: number): Promise<Blocker[]> {
    const response = await fetch(`${this.baseUrl}/blocker/${blockerId}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch blocker issues");
    const data = await response.json();
    return data.map((item: any) => new Blocker(item));
  }

  async getBlockedIssues(blockedId: number): Promise<Blocker[]> {
    const response = await fetch(`${this.baseUrl}/blocked/${blockedId}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch blocked issues");
    const data = await response.json();
    return data.map((item: any) => new Blocker(item));
  }

  async deleteBlocker(blockerId: number, blockedId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${blockerId}/${blockedId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete blocker");
  }
}

export const blockerService = new BlockerService();
