import { API_BASE_URL } from "../config/ApiConfig";
import { Issue } from "../models/Issue";
import { IssueTag } from "../models/IssueTag";
import { Tag } from "../models/Tag";
import { sessionStorage } from "../store/Session";

export const ISSUE_CREATED = "issue_created";
export const ISSUE_UPDATED = "issue_updated";
export const ISSUE_DELETED = "issue_deleted";
export const TAG_CREATED = "tag_created";
export const TAG_UPDATED = "tag_updated";
export const TAG_DELETED = "tag_deleted";
export const ISSUE_TAG_CREATED = "issue_tag_created";
export const ISSUE_TAG_UPDATED = "issue_tag_updated";
export const ISSUE_TAG_DELETED = "issue_tag_deleted";

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
      console.log("Connected to server");
      this.isConnecting = false;
      this.heartbeatId && clearInterval(this.heartbeatId);
      this.heartbeatId = setInterval(() => {
        this.ping();
      }, 5000);
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const eventTypes = [ISSUE_CREATED, ISSUE_UPDATED, ISSUE_DELETED];
      const eventType = eventTypes.find((type) => type === data.event_type);
      if (eventType) {
        const callbacks = this.eventCallbacks.get(eventType) || [];
        const issue =
          eventType !== ISSUE_DELETED ? new Issue(data.data) : data.data;
        callbacks.forEach((callback) => callback(issue));
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
  public static subscribeToIssueTagCreatedEvent(
    callback: (data: { issueTag: IssueTag }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", ISSUE_TAG_CREATED);
  }

  public static unsubscribeToIssueTagCreatedEvent(
    callback: (data: { issueTag: IssueTag }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", ISSUE_TAG_CREATED);
  }

  public static subscribeToIssueTagUpdatedEvent(
    callback: (data: { issueTag: IssueTag }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", ISSUE_TAG_UPDATED);
  }

  public static unsubscribeToIssueTagUpdatedEvent(
    callback: (data: { issueTag: IssueTag }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", ISSUE_TAG_UPDATED);
  }

  public static subscribeToIssueTagDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(callback, "subscribe", ISSUE_TAG_DELETED);
  }

  public static unsubscribeToIssueTagDeletedEvent(
    callback: (data: { id: number }) => void,
  ) {
    this.handleEventSubscription(callback, "unsubscribe", ISSUE_TAG_DELETED);
  }
}
