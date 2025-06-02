export class Project {
  id: number;
  name: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  notificationCount: number;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.ownerId = data.owner_id;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
    this.notificationCount = data.notification_count || 0;
  }
}
