export class Tag {
  id: number;
  name: string;
  isEpic: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.isEpic = data.is_epic;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
