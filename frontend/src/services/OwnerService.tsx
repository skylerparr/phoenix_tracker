import { BaseService } from "./base/BaseService";
import { Owner } from "../models/Owner";

interface CreateOwnerRequest {
  userId?: number;
}

interface UpdateOwnerRequest {
  userId?: number;
}

export class OwnerService extends BaseService<Owner> {
  constructor() {
    super("/owners");
  }

  protected createInstance(data: any): Owner {
    return new Owner(data);
  }

  async createOwner(request: CreateOwnerRequest): Promise<Owner> {
    return this.post<Owner>("", request);
  }

  async getAllOwners(): Promise<Owner[]> {
    return this.get<Owner[]>();
  }

  async getOwner(id: number): Promise<Owner> {
    return this.get<Owner>(`/${id}`);
  }

  async updateOwner(id: number, request: UpdateOwnerRequest): Promise<Owner> {
    return this.put<Owner>(`/${id}`, request);
  }

  async deleteOwner(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }
}

export const ownerService = new OwnerService();
