export class Tag {
  id: number;
  name: string;
  isEpic: boolean;
  count: number | undefined;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.isEpic = data.is_epic;
    this.count = data.count;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
