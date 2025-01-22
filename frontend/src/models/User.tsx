export class User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  isProjectOwner: boolean;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.createdAt = new Date(data.created_at);
    this.updatedAt = new Date(data.updated_at);
    this.isProjectOwner = data.is_project_owner;
  }
}
