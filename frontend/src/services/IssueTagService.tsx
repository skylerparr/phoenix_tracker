import { API_BASE_URL } from "../config/ApiConfig";
import { sessionStorage } from "../store/Session";
import { IssueTag } from "../models/IssueTag";
import { tagService } from "../services/TagService";
import { Tag } from "../models/Tag";
import { Issue } from "../models/Issue";

interface CreateIssueTagRequest {
  issueId: number;
  tagId: number;
}

export class IssueTagService {
  private baseUrl = `${API_BASE_URL}/issue-tags`;

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `${sessionStorage.getSession().user?.token}`,
    };
  }

  async createIssueTag(request: CreateIssueTagRequest): Promise<IssueTag> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to create issue tag");
    const data = await response.json();
    return new IssueTag(data);
  }

  async getIssueTagsByIssueId(issueId: number): Promise<IssueTag[]> {
    const response = await fetch(`${this.baseUrl}/issue/${issueId}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch issue tags");
    const data = await response.json();
    return data.map((item: any) => new IssueTag(item));
  }

  async getIssuesByTagId(tagId: number): Promise<IssueTag[]> {
    const response = await fetch(`${this.baseUrl}/tag/${tagId}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch tag issues");
    const data = await response.json();
    return data.map((item: any) => new IssueTag(item));
  }

  async deleteIssueTag(issueId: number, tagId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${issueId}/${tagId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete issue tag");
  }
  async getTagsForIssue(issue: Issue): Promise<Tag[]> {
    return new Promise((resolve) => {
      const handleTags = async (sourceTags: Tag[]) => {
        const issueTags = issue.issueTagIds;
        const associatedTags = issueTags
          .map((issueTagId) =>
            sourceTags.find((sourceTag) => sourceTag.id === issueTagId),
          )
          .filter((tag): tag is Tag => tag !== undefined);
        resolve(associatedTags);
      };

      tagService.subscribeToGetAllTags(handleTags);
    });
  }
}

export const issueTagService = new IssueTagService();
