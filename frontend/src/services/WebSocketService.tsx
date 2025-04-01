import { API_BASE_URL } from "../config/ApiConfig";
import { Issue } from "../models/Issue";
import { IssueAssignee } from "../models/IssueAssignee";
import { Tag } from "../models/Tag";
import { User } from "../models/User";
import { sessionStorage } from "../store/Session";

export const ISSUE_CREATED = "issue_created";
export const ISSUE_UPDATED = "issue_updated";
export const ISSUE_DELETED = "issue_deleted";
export const TAG_CREATED = "tag_created";
export const TAG_UPDATED = "tag_updated";
export const TAG_DELETED = "tag_deleted";
export const USER_CREATED = "user_created";
export const USER_UPDATED = "user_updated";
export const USER_DELETED = "user_deleted";
export const ISSUE_ASSIGNEE_CREATED = "issue_assignee_created";
export const ISSUE_ASSIGNEE_UPDATED = "issue_assignee_updated";
export const ISSUE_ASSIGNEE_DELETED = "issue_assignee_deleted";

export class WebsocketService {
  private static socket: WebSocket;
  private static isConnecting: boolean = false;
  private static eventCallbacks: Map<string, ((data: any) => void)[]> =
    new Map();
  private static heartbeatId: ReturnType<typeof setInterval> | null = null;
  private static createNewConnection() {
    const wsUrl = `${API_BASE_URL.replace("http", "ws")}/ws?token=${sessionStorage.getSession().user?.token}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnecting = false;
      this.heartbeatId && clearInterval(this.heartbeatId);
      this.heartbeatId = setInterval(() => {
        this.ping();
      }, 5000);
    };

    this.socket.onmessage = (event) => {
      // Handle pong messages from server
      if (event.data === "pong") {
        console.debug("Received pong from server");
        return;
      }

      try {
        const data = JSON.parse(event.data);
        const eventTypes = [
          ISSUE_CREATED,
          ISSUE_UPDATED,
          ISSUE_DELETED,
          TAG_CREATED,
          TAG_UPDATED,
          TAG_DELETED,
        ];
        const eventType = eventTypes.find((type) => type === data.event_type);
        if (eventType) {
          const callbacks = this.eventCallbacks.get(eventType) || [];
          const issue =
            eventType !== ISSUE_DELETED ? new Issue(data.data) : data.data;
          callbacks.forEach((callback) => callback(issue));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.socket.onclose = () => {
      this.isConnecting = false;
      this.heartbeatId && clearInterval(this.heartbeatId);
      setTimeout(() => {
        this.createNewConnection();
      }, 1000);
    };
  }

  public static async connect() {
    if (this.socket || this.isConnecting) return;
    this.isConnecting = true;
    this.createNewConnection();
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
    callback: (data: any) => void,
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

  public static subscribeToIssueUpdatedEvent(callback: (data: Issue) => void) {
    this.handleEventSubscription(callback, "subscribe", ISSUE_UPDATED);
  }

  public static unsubscribeToIssueUpdatedEvent(
    callback: (data: Issue) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", ISSUE_UPDATED);
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
  public static subscribeToTagCreatedEvent(
    callback: (data: { tag: Tag }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", TAG_CREATED);
  }

  public static unsubscribeToTagCreatedEvent(
    callback: (data: { tag: Tag }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", TAG_CREATED);
  }

  public static subscribeToTagUpdatedEvent(
    callback: (data: { tag: Tag }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", TAG_UPDATED);
  }

  public static unsubscribeToTagUpdatedEvent(
    callback: (data: { tag: Tag }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", TAG_UPDATED);
  }

  public static subscribeToTagDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", TAG_DELETED);
  }

  public static unsubscribeToTagDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", TAG_DELETED);
  }

  public static subscribeToUserCreatedEvent(
    callback: (data: { user: User }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", USER_CREATED);
  }

  public static unsubscribeToUserCreatedEvent(
    callback: (data: { user: User }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", USER_CREATED);
  }

  public static subscribeToUserUpdatedEvent(
    callback: (data: { user: User }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", USER_UPDATED);
  }

  public static unsubscribeToUserUpdatedEvent(
    callback: (data: { user: User }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", USER_UPDATED);
  }

  public static subscribeToUserDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", USER_DELETED);
  }

  public static unsubscribeToUserDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", USER_DELETED);
  }

  public static subscribeToIssueAssigneeCreatedEvent(
    callback: (data: { issueAssignee: IssueAssignee }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", ISSUE_ASSIGNEE_CREATED);
  }

  public static unsubscribeToIssueAssigneeCreatedEvent(
    callback: (data: { issueAssignee: IssueAssignee }) => void,
  ) {
    this.handleEventSubscription(
      callback,
      "unsubscribe",
      ISSUE_ASSIGNEE_CREATED,
    );
  }

  public static subscribeToIssueAssigneeUpdatedEvent(
    callback: (data: { issueAssignee: IssueAssignee }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", ISSUE_ASSIGNEE_UPDATED);
  }

  public static unsubscribeToIssueAssigneeUpdatedEvent(
    callback: (data: { issueAssignee: IssueAssignee }) => void,
  ) {
    this.handleEventSubscription(
      callback,
      "unsubscribe",
      ISSUE_ASSIGNEE_UPDATED,
    );
  }

  public static subscribeToIssueAssigneeDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", ISSUE_ASSIGNEE_DELETED);
  }

  public static unsubscribeToIssueAssigneeDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(
      callback,
      "unsubscribe",
      ISSUE_ASSIGNEE_DELETED,
    );
  }
}
