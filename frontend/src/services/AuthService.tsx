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

interface SwitchProjectRequest {
  projectId: number;
}

export class AuthService {
  private baseUrl = `${API_BASE_URL}/api/auth`;

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

  async switchProject(
    request: SwitchProjectRequest,
    token: string,
  ): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/switch-project`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to switch project");
    return response.json();
  }
}

export const authService = new AuthService();
