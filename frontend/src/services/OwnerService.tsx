import { API_BASE_URL } from "../config/ApiConfig";
import { Owner } from "../models/Owner";
import { sessionStorage } from "../store/Session";

interface CreateOwnerRequest {
  user_id?: number;
}

interface UpdateOwnerRequest {
  user_id?: number;
}

export class OwnerService {
  private baseUrl = `${API_BASE_URL}/owners`;

  async createOwner(request: CreateOwnerRequest): Promise<Owner> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create owner");
    return response.json();
  }

  async getAllOwners(): Promise<Owner[]> {
    const response = await fetch(this.baseUrl, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch owners");
    return response.json();
  }

  async getOwner(id: number): Promise<Owner> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch owner");
    return response.json();
  }

  async updateOwner(id: number, request: UpdateOwnerRequest): Promise<Owner> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update owner");
    return response.json();
  }

  async deleteOwner(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to delete owner");
  }
}

export const ownerService = new OwnerService();
