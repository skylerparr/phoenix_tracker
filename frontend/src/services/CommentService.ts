import { API_BASE_URL } from "../config/ApiConfig";
import { Comment } from "../models/Comment";

interface CreateCommentRequest {
  content: string;
  user_id: number;
  issue_id: number;
}

interface UpdateCommentRequest {
  content?: string;
}

export class CommentService {
  private baseUrl = `${API_BASE_URL}/comments`;

  async createComment(request: CreateCommentRequest): Promise<Comment> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create comment");
    return response.json();
  }

  async getAllComments(): Promise<Comment[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) throw new Error("Failed to fetch comments");
    return response.json();
  }

  async getComment(id: number): Promise<Comment> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) throw new Error("Failed to fetch comment");
    return response.json();
  }

  async getCommentsByIssue(issueId: number): Promise<Comment[]> {
    const response = await fetch(`${this.baseUrl}/issue/${issueId}`);
    if (!response.ok) throw new Error("Failed to fetch comments by issue");
    return response.json();
  }

  async getCommentsByUser(userId: number): Promise<Comment[]> {
    const response = await fetch(`${this.baseUrl}/user/${userId}`);
    if (!response.ok) throw new Error("Failed to fetch comments by user");
    return response.json();
  }

  async updateComment(
    id: number,
    request: UpdateCommentRequest,
  ): Promise<Comment> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to update comment");
    return response.json();
  }

  async deleteComment(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete comment");
  }
}

export const commentService = new CommentService();
