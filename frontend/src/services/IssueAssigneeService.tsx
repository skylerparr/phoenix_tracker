import { BaseService } from "./base/BaseService";
import { IssueAssignee } from "../models/IssueAssignee";

interface CreateIssueAssigneeRequest {
  issueId: number;
  userId: number;
}

export class IssueAssigneeService extends BaseService<IssueAssignee> {
  constructor() {
    super("/issue-assignees");
  }

  async createIssueAssignee(
    request: CreateIssueAssigneeRequest,
  ): Promise<IssueAssignee> {
    return this.post<IssueAssignee>("", request);
  }

  async getIssueAssigneesByIssueId(issueId: number): Promise<IssueAssignee[]> {
    return this.get<IssueAssignee[]>(`/issue/${issueId}`);
  }

  async getUserAssigneesByUserId(userId: number): Promise<IssueAssignee[]> {
    return this.get<IssueAssignee[]>(`/user/${userId}`);
  }

  async deleteIssueAssignee(issueId: number, userId: number): Promise<void> {
    return this.delete(`/${issueId}/${userId}`);
  }
}

export const issueAssigneeService = new IssueAssigneeService();
