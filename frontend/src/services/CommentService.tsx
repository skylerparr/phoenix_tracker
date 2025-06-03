import { BaseService } from "./base/BaseService";
import { Comment } from "../models/Comment";

interface CreateCommentRequest {
  content: string;
  issueId: number;
}

interface UpdateCommentRequest {
  content: string;
}

export class CommentService extends BaseService<Comment> {
  constructor() {
    super("/comments");
  }

  protected createInstance(data: any): Comment {
    return new Comment(data);
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

  async updateComment(
    id: number,
    request: UpdateCommentRequest,
  ): Promise<Comment> {
    return this.put<Comment>(`/${id}`, request);
  }

  async deleteComment(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }
}

export const commentService = new CommentService();
