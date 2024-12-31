interface Session {
  isAuthenticated: boolean;
  user: {
    token: string;
    name: string;
    email: string;
  } | null;
  activeButtons: string[];
}

const SESSION_KEY = "userSession";

class SessionStorage {
  private static instance: SessionStorage;
  private session: Session;

  private constructor() {
    const savedSession = localStorage.getItem(SESSION_KEY);
    this.session = savedSession
      ? JSON.parse(savedSession)
      : {
          isAuthenticated: false,
          user: null,
          activeButtons: [],
        };
  }

  public static getInstance(): SessionStorage {
    if (!SessionStorage.instance) {
      SessionStorage.instance = new SessionStorage();
    }
    return SessionStorage.instance;
  }

  public getSession(): Session {
    return this.session;
  }

  public setUserData(userData: {
    token: string;
    name: string;
    email: string;
  }): void {
    this.session = {
      isAuthenticated: true,
      user: userData,
      activeButtons: this.session.activeButtons || [],
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
  }

  public logout(): void {
    this.session = {
      isAuthenticated: false,
      user: null,
      activeButtons: this.session.activeButtons,
    };
    localStorage.removeItem(SESSION_KEY);
  }

  public getActiveButtons(): string[] {
    return this.session.activeButtons || [];
  }

  public setActiveButtons(buttons: string[]): void {
    this.session = {
      ...this.session,
      activeButtons: buttons,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
  }
}

export const sessionStorage = SessionStorage.getInstance();
