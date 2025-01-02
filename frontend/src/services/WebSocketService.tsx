import { API_BASE_URL } from "../config/ApiConfig";
import { Issue } from "../models/Issue";
import { sessionStorage } from "../store/Session";

export const ISSUE_CREATED = "issue_created";
export const ISSUE_DELETED = "issue_deleted";

export class WebsocketService {
  private static socket: WebSocket;
  private static isConnecting: boolean = false;
  private static eventCallbacks: Map<string, ((data: any) => void)[]> =
    new Map();

  public static async connect() {
    if (this.socket || this.isConnecting) return;

    const wsUrl = `${API_BASE_URL.replace("http", "ws")}/ws?token=${sessionStorage.getSession().user?.token}`;
    this.isConnecting = true;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("Connected to server");
      this.isConnecting = false;
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event_type === ISSUE_CREATED) {
        const issue = new Issue(data.data);
        const callbacks = this.eventCallbacks.get(ISSUE_CREATED) || [];
        callbacks.forEach((callback) => callback(issue));
      } else if (data.event_type === ISSUE_DELETED) {
        const callbacks = this.eventCallbacks.get(ISSUE_DELETED) || [];
        callbacks.forEach((callback) => callback(data.data));
      }
    };

    this.socket.onclose = () => {
      this.isConnecting = false;
      setTimeout(() => {
        const newSocket = new WebSocket(wsUrl);
        Object.assign(this.socket, newSocket);
      }, 1000);
    };
  }
  private static async ensureConnection() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  public static async ping() {
    await this.ensureConnection();
    this.socket.send("ping");
  }

  public static async subscribe() {
    await this.ensureConnection();
    this.socket.send(`{"command": "subscribe"}`);
  }

  public static async unsubscribe() {
    await this.ensureConnection();
    this.socket.send(`{"command": "unsubscribe"}`);
  }

  private static handleEventSubscription(
    callback: (data: Issue) => void,
    action: "subscribe" | "unsubscribe",
    eventType: string,
  ) {
    const callbacks = this.eventCallbacks.get(eventType) || [];
    if (action === "subscribe") {
      callbacks.push(callback);
    } else {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    this.eventCallbacks.set(eventType, callbacks);
  }

  public static subscribeToIssueCreateEvent(callback: (data: Issue) => void) {
    this.handleEventSubscription(callback, "subscribe", ISSUE_CREATED);
  }

  public static unsubscribeToIssueCreateEvent(callback: (data: Issue) => void) {
    this.handleEventSubscription(callback, "unsubscribe", ISSUE_CREATED);
  }

  public static subscribeToIssueDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", ISSUE_DELETED);
  }

  public static unsubscribeToIssueDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", ISSUE_DELETED);
  }
}
