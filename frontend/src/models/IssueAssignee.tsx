export class IssueAssignee {
  issueId: number;
  userId: number;

  constructor(data: any) {
    this.issueId = data.issue_id;
    this.userId = data.user_id;
  }
}
