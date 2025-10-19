import { BaseService } from "./base/BaseService";
import { ProjectNoteHistory } from "../models/ProjectNoteHistory";

export class ProjectNoteHistoryService extends BaseService<ProjectNoteHistory> {
  constructor() {
    super("/history");
  }

  protected createInstance(data: any): ProjectNoteHistory {
    return new ProjectNoteHistory(data);
  }

  async getHistoryByProjectNote(
    projectNoteId: number,
  ): Promise<ProjectNoteHistory[]> {
    return await this.get<ProjectNoteHistory[]>(
      `/project-note/${projectNoteId}`,
    );
  }
}

export const projectNoteHistoryService = new ProjectNoteHistoryService();
