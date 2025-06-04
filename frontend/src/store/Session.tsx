interface Session {
  isAuthenticated: boolean;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  activeButtons: string[];
  hasProject: boolean;
}

const ACTIVE_BUTTONS_KEY = "phoenix_tracker_active_buttons";

class SessionStorage {
  private static instance: SessionStorage;

  private constructor() {}

  public static getInstance(): SessionStorage {
    if (!SessionStorage.instance) {
      SessionStorage.instance = new SessionStorage();
    }
    return SessionStorage.instance;
  }

  // Cookie helper methods
  private setCookie(name: string, value: string, days: number = 7): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  }

  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
  }

  // JWT Token methods - hybrid approach for multi-tab support
  public getToken(): string | null {
    // First try to get project-specific token from sessionStorage (tab-specific)
    const projectToken = window.sessionStorage.getItem("project_auth_token");
    if (projectToken) {
      return projectToken;
    }

    // Fall back to base auth token from localStorage (shared across tabs)
    const baseToken = localStorage.getItem("base_auth_token");
    return baseToken;
  }

  public setToken(token: string): void {
    const cleanToken = token.replace("Bearer ", "");
    const claims = this.parseJWT(cleanToken);

    if (claims && claims.project_id) {
      // Project-specific token - store in sessionStorage (tab-specific)
      window.sessionStorage.setItem("project_auth_token", token);
    } else {
      // Base auth token - store in localStorage (shared across tabs)
      localStorage.setItem("base_auth_token", token);
      // Clear any existing project token in this tab
      window.sessionStorage.removeItem("project_auth_token");
    }
  }

  public clearToken(): void {
    localStorage.removeItem("base_auth_token");
    window.sessionStorage.removeItem("project_auth_token");
  }

  // JWT parsing to extract user info
  private parseJWT(token: string): any {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  public getSession(): Session {
    const token = this.getToken();
    const activeButtons = this.getActiveButtons();

    if (!token) {
      return {
        isAuthenticated: false,
        user: null,
        activeButtons,
        hasProject: false,
      };
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace("Bearer ", "");
    const claims = this.parseJWT(cleanToken);

    if (!claims || !claims.user_id) {
      return {
        isAuthenticated: false,
        user: null,
        activeButtons,
        hasProject: false,
      };
    }

    // For user details, we'll need to get them from the backend when needed
    // For now, just return basic info from JWT
    return {
      isAuthenticated: true,
      user: {
        id: claims.user_id,
        name: "",
        email: "",
      },
      activeButtons,
      hasProject: !!claims.project_id,
    };
  }

  public setUserData(userData: {
    user_id: number;
    token: string;
    name?: string;
    email?: string;
  }): void {
    this.setToken(userData.token);
  }

  public updateUserToken(token: string): void {
    this.setToken(token);
  }

  public logout(): void {
    this.clearToken();
  }

  public getActiveButtons(): string[] {
    const buttons = localStorage.getItem(ACTIVE_BUTTONS_KEY);
    return buttons ? JSON.parse(buttons) : [];
  }

  public setActiveButtons(buttons: string[]): void {
    localStorage.setItem(ACTIVE_BUTTONS_KEY, JSON.stringify(buttons));
  }

  // Project methods - now determined from JWT
  public hasProjectSelected(): boolean {
    const session = this.getSession();
    return session.hasProject;
  }

  // Check if user needs to select a project
  public needsProjectSelection(): boolean {
    const session = this.getSession();
    return session.isAuthenticated && !session.hasProject;
  }

  // Get current project ID from JWT
  public getCurrentProjectId(): number | null {
    const token = this.getToken();
    if (!token) return null;

    const cleanToken = token.replace("Bearer ", "");
    const claims = this.parseJWT(cleanToken);
    return claims?.project_id || null;
  }
}

export const sessionStorage = SessionStorage.getInstance();
