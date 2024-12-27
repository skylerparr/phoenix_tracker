interface Session {
  isAuthenticated: boolean;
  user: {
    token: string;
    name: string;
    email: string;
  } | null;
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

  public setSession(session: Session): void {
    this.session = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  public clearSession(): void {
    this.session = {
      isAuthenticated: false,
      user: null,
    };
    localStorage.removeItem(SESSION_KEY);
  }
}

export const sessionStorage = SessionStorage.getInstance();
