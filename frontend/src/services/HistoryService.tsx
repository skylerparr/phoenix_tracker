import { BaseService } from "./base/BaseService";
import { History } from "../models/History";

export class HistoryService extends BaseService<History> {
  constructor() {
    super("/history");
  }

  protected createInstance(data: any): History {
    return new History(data);
  }

  async getHistoryByIssue(issueId: number): Promise<History[]> {
    return this.get<History[]>(`/issue/${issueId}`);
  }
}

export const historyService = new HistoryService();
