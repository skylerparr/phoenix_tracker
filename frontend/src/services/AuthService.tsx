import { API_BASE_URL } from "../config/ApiConfig";

interface LoginRequest {
  email: string;
}

interface RegisterRequest {
  name: string;
  email: string;
}

interface AuthResponse {
  user_id: number;
  token: string;
  expires_at: string;
  project_id: number;
}

export class AuthService {
  private baseUrl = `${API_BASE_URL}/auth`;

  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to login");
    return response.json();
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to register");
    return response.json();
  }

  async logout(userId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!response.ok) throw new Error("Failed to logout");
  }
}

export const authService = new AuthService();
