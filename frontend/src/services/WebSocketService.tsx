import { API_BASE_URL } from "../config/ApiConfig";
const socket = new WebSocket(`${API_BASE_URL.replace("http", "ws")}/ws`);

socket.onopen = () => {
  console.log("Connected to server");
};

socket.onclose = () => {
  // Implement reconnection logic
  setTimeout(() => {
    const newSocket = new WebSocket(`${API_BASE_URL.replace("http", "ws")}/ws`);
    Object.assign(socket, newSocket);
  }, 1000);
};

export async function ping() {
  socket.send("ping");
}
