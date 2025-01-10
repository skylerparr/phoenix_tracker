import { WebsocketService } from "../WebSocketService";
import { BaseService } from "./BaseService";

type WebSocketEventType =
  | "IssueCreateEvent"
  | "IssueUpdatedEvent"
  | "IssueDeletedEvent"
  | "TagCreatedEvent"
  | "TagUpdatedEvent"
  | "TagDeletedEvent";

type WebSocketServiceType = {
  [K in
    | `subscribeTo${WebSocketEventType}`
    | `unsubscribeTo${WebSocketEventType}`]: (
    callback: () => Promise<void>,
  ) => void;
};

export abstract class WebSocketEnabledService<T> extends BaseService<T> {
  protected callbacks: ((items: T[]) => void)[] = [];
  protected cache: T[] | null = null;

  protected setupWebSocketSubscription(
    notifyMethod: () => Promise<void>,
    eventTypes: WebSocketEventType[],
  ) {
    if (this.callbacks.length === 1) {
      eventTypes.forEach((eventType) => {
        (WebsocketService as WebSocketServiceType)[`subscribeTo${eventType}`](
          notifyMethod,
        );
      });
    }
  }

  protected cleanupWebSocketSubscription(
    notifyMethod: () => Promise<void>,
    eventTypes: WebSocketEventType[],
  ) {
    if (this.callbacks.length === 0) {
      eventTypes.forEach((eventType) => {
        (WebsocketService as WebSocketServiceType)[`unsubscribeTo${eventType}`](
          notifyMethod,
        );
      });
    }
  }

  protected subscribe(
    callback: (items: T[]) => void,
    notifyMethod: () => Promise<void>,
  ) {
    this.callbacks.push(callback);
    if (this.cache) {
      callback(this.cache);
      return;
    }
    notifyMethod();
  }

  protected unsubscribe(callback: (items: T[]) => void) {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }
}
