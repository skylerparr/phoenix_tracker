import { BaseService } from "./base/BaseService";
import { ProjectNotePart } from "../models/ProjectNotePart";
import { WebsocketService } from "./WebSocketService";

export const PROJECT_NOTE_PART_UPDATED = "project_note_part_updated";

export interface UpdateProjectNotePartRequest {
  content: string;
}

export class ProjectNotePartService extends BaseService<ProjectNotePart> {
  constructor() {
    super("/project-note-parts");
  }

  protected createInstance(data: any): ProjectNotePart {
    return new ProjectNotePart(data);
  }

  async updateProjectNotePartContent(
    id: number,
    request: UpdateProjectNotePartRequest,
  ): Promise<ProjectNotePart> {
    return this.put<ProjectNotePart>(`/${id}/content`, request);
  }

  public subscribeToProjectNotePartUpdatedEvent(
    callback: (data: ProjectNotePart) => void,
  ) {
    WebsocketService.subscribeToProjectNotePartUpdatedEvent(callback);
  }

  public unsubscribeToProjectNotePartUpdatedEvent(
    callback: (data: ProjectNotePart) => void,
  ) {
    WebsocketService.unsubscribeToProjectNotePartUpdatedEvent(callback);
  }
}

export const projectNotePartService = new ProjectNotePartService();
