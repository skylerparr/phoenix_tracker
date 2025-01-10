import { BaseService } from "./base/BaseService";
import { Comment } from "../models/Comment";

interface CreateCommentRequest {
  content: string;
  issueId: number;
}

export class CommentService extends BaseService<Comment> {
  constructor() {
    super("/comments");
  }

  async createComment(request: CreateCommentRequest): Promise<Comment> {
    return this.post<Comment>("", request);
  }

  async getCommentsByIssue(issueId: number): Promise<Comment[]> {
    return this.get<Comment[]>(`/issue/${issueId}`);
  }

  async getCommentsByUser(userId: number): Promise<Comment[]> {
    return this.get<Comment[]>(`/user/${userId}`);
  }
}

export const commentService = new CommentService();
