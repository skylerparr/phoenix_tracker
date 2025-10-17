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

  // Returns a function that formats a user's display name, appending the email domain
  // when duplicate names exist within the provided list of users.
  static buildDisplayNameFormatter(allUsers: User[]): (user: User) => string {
    const nameCount: Record<string, number> = {};
    allUsers.forEach((u) => {
      nameCount[u.name] = (nameCount[u.name] || 0) + 1;
    });

    return (user: User) => {
      if (nameCount[user.name] > 1) {
        const domain = user.email.split("@")[1] ?? user.email;
        return `${user.name} (${domain})`;
      }
      return user.name;
    };
  }
}
