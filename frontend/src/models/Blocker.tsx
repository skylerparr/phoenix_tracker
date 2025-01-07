export class Blocker {
  blockerId: number;
  blockedId: number;

  constructor(data: any) {
    this.blockerId = data.blocker_id;
    this.blockedId = data.blocked_id;
  }
}
