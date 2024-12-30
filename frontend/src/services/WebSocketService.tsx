import { API_BASE_URL } from "../config/ApiConfig";
import { sessionStorage } from "../store/Session";

export class WebsocketService {
  private static socket: WebSocket;
  private static isConnecting: boolean = false;

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
      console.log("Received data:", event.data);
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

  public static async subscribe(projectId: number) {
    await this.ensureConnection();
    this.socket.send(`{"command": "subscribe", "projectId": ${projectId}}`);
  }

  public static async unsubscribe(projectId: number) {
    await this.ensureConnection();
    this.socket.send(`{"command": "unsubscribe", "projectId": ${projectId}}`);
  }
}
