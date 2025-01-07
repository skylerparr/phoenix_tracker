import { API_BASE_URL } from "../config/ApiConfig";
import { Comment } from "../models/Comment";
import { sessionStorage } from "../store/Session";

interface CreateCommentRequest {
  content: string;
  issueId: number;
}

interface UpdateCommentRequest {
  content?: string;
}

export class CommentService {
  private baseUrl = `${API_BASE_URL}/comments`;

  async createComment(request: CreateCommentRequest): Promise<Comment> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create comment");
    const data = await response.json();
    return new Comment(data);
  }

  async getCommentsByIssue(issueId: number): Promise<Comment[]> {
    const response = await fetch(`${this.baseUrl}/issue/${issueId}`, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch comments by issue");
    const data = await response.json();
    return data.map((commentData: any) => new Comment(commentData));
  }

  async getCommentsByUser(userId: number): Promise<Comment[]> {
    const response = await fetch(`${this.baseUrl}/user/${userId}`, {
      headers: {
        Authorization: `${sessionStorage.getSession().user?.token}`,
      },
    });
    if (!response.ok) throw new Error("Failed to fetch comments by user");
    const data = await response.json();
    return data.map((commentData: any) => new Comment(commentData));
  }
}

export const commentService = new CommentService();
