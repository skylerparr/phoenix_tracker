import { BaseService } from "./base/BaseService";
import { History } from "../models/History";
import { ProjectNoteHistory } from "../models/ProjectNoteHistory";

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

  async getHistoryByProjectNote(
    projectNoteId: number,
  ): Promise<ProjectNoteHistory[]> {
    const response = await this.get<any[]>(`/project-note/${projectNoteId}`);
    return response.map((data) => new ProjectNoteHistory(data));
  }
}

export const historyService = new HistoryService();
