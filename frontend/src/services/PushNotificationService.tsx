/**
 * PushNotificationService
 * Handles browser notifications via the Notification API
 */

export interface PushNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export class PushNotificationService {
  private static readonly NOTIFICATION_ICON = "/logo.svg";
  private static readonly NOTIFICATION_BADGE = "/logo.svg";

  /**
   * Check if browser notifications are supported
   */
  public static isSupported(): boolean {
    return "Notification" in window;
  }

  /**
   * Check if notifications are enabled (permission granted)
   */
  public static isEnabled(): boolean {
    if (!this.isSupported()) {
      return false;
    }
    return Notification.permission === "granted";
  }

  /**
   * Get current notification permission status
   */
  public static getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return "denied";
    }
    return Notification.permission;
  }

  /**
   * Request permission for notifications
   * This will show the browser's native permission prompt
   */
  public static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn("Browser notifications not supported");
      return false;
    }

    const current = Notification.permission;
    if (current === "granted") {
      return true;
    }

    if (current === "denied") {
      console.warn(
        "Notifications denied by user. To re-enable, change browser settings.",
      );
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  /**
   * Send a browser notification
   */
  public static async send(options: PushNotificationOptions): Promise<void> {
    if (!this.isEnabled()) {
      console.warn("Notifications not enabled");
      return;
    }

    try {
      const notificationOptions: NotificationOptions = {
        body: options.body || "",
        icon: options.icon || this.NOTIFICATION_ICON,
        badge: options.badge || this.NOTIFICATION_BADGE,
        tag: options.tag || "default",
        requireInteraction: options.requireInteraction ?? false,
      };

      const notification = new Notification(options.title, notificationOptions);
      // Handle notification click - focus the window
      notification.addEventListener("click", () => {
        window.focus();
        notification.close();
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }
}
