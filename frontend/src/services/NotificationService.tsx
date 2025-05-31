import { BaseService } from "./base/BaseService";
import { Notification } from "../models/Notification";

export class NotificationService extends BaseService<Notification> {
  constructor() {
    super("/notifications");
  }

  protected createInstance(data: any): Notification {
    return new Notification(data);
  }

  async getNotificationsForProject(): Promise<Notification[]> {
    return this.get<Notification[]>("");
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    return this.put<Notification>(`/${id}/read`);
  }

  async getNotificationCountForProject(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/count`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch notification count");
    return response.json();
  }
}

export const notificationService = new NotificationService();
