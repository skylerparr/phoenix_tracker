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
  private static wasConnected: boolean = false;
  private static reconnectAttempts: number = 0;
  private static maxReconnectAttempts: number = 10;
  private static reconnectTimeoutId: ReturnType<typeof setTimeout> | null =
    null;

  private static createNewConnection() {
    const token = sessionStorage.getToken();
    const cleanToken = token ? token.replace("Bearer ", "") : "";
    const wsUrl = `${API_BASE_URL.replace("http", "ws")}/ws?token=${cleanToken}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = async () => {
      console.info("WebSocket connected successfully");
      this.isConnecting = false;
      this.reconnectAttempts = 0; // Reset on successful connection

      // Clear any existing reconnect timeout
      if (this.reconnectTimeoutId) {
        clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = null;
      }

      this.heartbeatId && clearInterval(this.heartbeatId);
      this.heartbeatId = setInterval(() => {
        this.ping();
      }, 5000);

      if (this.wasConnected) {
        await this.subscribe();
      }
    };

    this.socket.onmessage = (event) => {
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
          USER_CREATED,
          USER_UPDATED,
          USER_DELETED,
          ISSUE_ASSIGNEE_CREATED,
          ISSUE_ASSIGNEE_UPDATED,
          ISSUE_ASSIGNEE_DELETED,
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

    this.socket.onclose = (event) => {
      console.warn("WebSocket connection closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      this.isConnecting = false;
      this.heartbeatId && clearInterval(this.heartbeatId);

      // Exponential backoff with jitter for reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const baseDelay = Math.min(
          1000 * Math.pow(2, this.reconnectAttempts),
          30000,
        );
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter
        const delay = baseDelay + jitter;

        console.info(
          `Attempting to reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
        );

        this.reconnectTimeoutId = setTimeout(() => {
          this.reconnectAttempts++;
          this.createNewConnection();
        }, delay);
      } else {
        console.error(
          "Max reconnection attempts reached. Please refresh the page.",
        );
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
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

    // Get the current project ID from the session
    const projectId = sessionStorage.getCurrentProjectId();
    if (projectId) {
      this.socket.send(`{"command": "subscribe", "project_id": ${projectId}}`);
    }
    this.wasConnected = true;
  }

  public static async unsubscribe() {
    await this.ensureConnection();

    // Get the current project ID from the session
    const projectId = sessionStorage.getCurrentProjectId();
    if (projectId) {
      this.socket.send(
        `{"command": "unsubscribe", "project_id": ${projectId}}`,
      );
    }
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
