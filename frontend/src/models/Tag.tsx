export class Tag {
  id: number;
  name: string;
  color: number;
  isEpic: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.color = data.color;
    this.isEpic = data.is_epic;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
  }
}
