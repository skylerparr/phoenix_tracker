import { API_BASE_URL } from "../config/ApiConfig";
import { Owner } from "../models/Owner";

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create owner");
    return response.json();
  }

  async getAllOwners(): Promise<Owner[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) throw new Error("Failed to fetch owners");
    return response.json();
  }

  async getOwner(id: number): Promise<Owner> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) throw new Error("Failed to fetch owner");
    return response.json();
  }

  async updateOwner(id: number, request: UpdateOwnerRequest): Promise<Owner> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update owner");
    return response.json();
  }

  async deleteOwner(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete owner");
  }
}

export const ownerService = new OwnerService();
