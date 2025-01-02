import { Project } from "../models/Project";

interface Session {
  isAuthenticated: boolean;
  user: {
    id: number;
    token: string;
    name: string;
    email: string;
  } | null;
  activeButtons: string[];
  project: Project | null;
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
          project: null,
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
    user_id: number;
    token: string;
    name: string;
    email: string;
  }): void {
    this.session = {
      isAuthenticated: true,
      user: {
        id: userData.user_id,
        token: userData.token,
        name: userData.name,
        email: userData.email,
      },
      activeButtons: this.session.activeButtons || [],
      project: this.session.project,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
  }

  public logout(): void {
    this.session = {
      isAuthenticated: false,
      user: null,
      activeButtons: this.session.activeButtons,
      project: null,
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

  public getProject(): Project | null {
    return this.session.project;
  }

  public setProject(project: Project | null): void {
    this.session = {
      ...this.session,
      project: project,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
  }
}

export const sessionStorage = SessionStorage.getInstance();
