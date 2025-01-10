import { BaseService } from "./base/BaseService";
import { IssueTag } from "../models/IssueTag";
import { tagService } from "./TagService";
import { Tag } from "../models/Tag";
import { Issue } from "../models/Issue";

interface CreateIssueTagRequest {
  issueId: number;
  tagId: number;
}

export class IssueTagService extends BaseService<IssueTag> {
  constructor() {
    super("/issue-tags");
  }

  protected createInstance(data: any): IssueTag {
    return new IssueTag(data);
  }

  async createIssueTag(request: CreateIssueTagRequest): Promise<IssueTag> {
    return this.post<IssueTag>("", request);
  }

  async getIssueTagsByIssueId(issueId: number): Promise<IssueTag[]> {
    return this.get<IssueTag[]>(`/issue/${issueId}`);
  }

  async getIssuesByTagId(tagId: number): Promise<IssueTag[]> {
    return this.get<IssueTag[]>(`/tag/${tagId}`);
  }

  async deleteIssueTag(issueId: number, tagId: number): Promise<void> {
    return this.delete(`/${issueId}/${tagId}`);
  }

  async getTagsForIssue(issue: Issue): Promise<Tag[]> {
    const sourceTags = await tagService.getAllTags();
    const issueTags = issue.issueTagIds;
    const associatedTags = issueTags
      .map((issueTagId) =>
        sourceTags.find((sourceTag) => sourceTag.id === issueTagId),
      )
      .filter((tag): tag is Tag => tag !== undefined);
    return associatedTags;
  }
}

export const issueTagService = new IssueTagService();
