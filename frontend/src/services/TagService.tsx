import { API_BASE_URL } from "../config/ApiConfig";
import { Tag } from "../models/Tag";
import { sessionStorage } from "../store/Session";

interface CreateTagRequest {
  name: string;
  color: number;
  isEpic: boolean;
}

interface UpdateTagRequest {
  name?: string;
  color?: number;
  isEpic?: boolean;
}

export class TagService {
  private baseUrl = `${API_BASE_URL}/tags`;

  async createTag(request: CreateTagRequest): Promise<Tag> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create tag");
    return response.json();
  }

  async getAllTags(): Promise<Tag[]> {
    const response = await fetch(this.baseUrl, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch tags");
    return response.json();
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update tag");
    return response.json();
  }

  async deleteTag(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to delete tag");
  }
}

export const tagService = new TagService();
