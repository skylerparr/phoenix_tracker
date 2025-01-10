import { BaseService } from "./base/BaseService";
import { Blocker } from "../models/Blocker";

interface CreateBlockerRequest {
  blockerId: number;
  blockedId: number;
}

export class BlockerService extends BaseService<Blocker> {
  constructor() {
    super("/blockers");
  }

  async createBlocker(request: CreateBlockerRequest): Promise<Blocker> {
    return this.post<Blocker>("", request);
  }

  async getBlockerIssues(blockerId: number): Promise<Blocker[]> {
    return this.get<Blocker[]>(`/blocker/${blockerId}`);
  }

  async getBlockedIssues(blockedId: number): Promise<Blocker[]> {
    return this.get<Blocker[]>(`/blocked/${blockedId}`);
  }

  async deleteBlocker(blockerId: number, blockedId: number): Promise<void> {
    return this.delete(`/${blockerId}/${blockedId}`);
  }
}

export const blockerService = new BlockerService();
