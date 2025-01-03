export class IssueTag {
  issueId: number;
  tagId: number;

  constructor(data: any) {
    this.issueId = data.issue_id;
    this.tagId = data.tag_id;
  }
}
