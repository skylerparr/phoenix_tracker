import { JwtUtils } from "./JwtUtils";
import { clearProjectCaches } from "./CacheManager";
import { API_BASE_URL } from "../config/ApiConfig";

export interface ProjectSwitchResult {
  success: boolean;
  token?: string;
  projectId?: number;
  userId?: number;
  error?: string;
}

/**
 * Centralized project management utility
 * Handles project switching, validation, and state management
 */
export class ProjectManager {
  private static readonly SWITCH_PROJECT_ENDPOINT = "/api/auth/switch-project";
  private static readonly BASE_URL = API_BASE_URL;

  /**
   * Switch to a different project
   */
  static async switchToProject(
    projectId: number,
    currentToken: string,
  ): Promise<ProjectSwitchResult> {
    try {
      console.log("Switching to project:", projectId);

      const response = await fetch(
        `${this.BASE_URL}${this.SWITCH_PROJECT_ENDPOINT}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: currentToken || "",
          },
          body: JSON.stringify({ projectId }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to switch project: ${response.status}`);
      }

      const data = await response.json();
      console.log("Switch project response:", data);

      // Validate the response
      if (!data.token || !JwtUtils.isValidTokenFormat(data.token)) {
        throw new Error("Invalid token received from server");
      }

      // Verify the token contains the expected project ID
      const expectedProjectId = JwtUtils.getProjectId(data.token);
      if (expectedProjectId !== projectId) {
        throw new Error(
          `Token project ID mismatch. Expected: ${projectId}, Got: ${expectedProjectId}`,
        );
      }

      // Clear all project-specific caches
      clearProjectCaches();

      return {
        success: true,
        token: data.token,
        projectId: data.project_id,
        userId: data.user_id,
      };
    } catch (error) {
      console.error("Project switch failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get current project info from token
   */
  static getCurrentProjectInfo(token: string | null): {
    hasProject: boolean;
    projectId: number | null;
    userId: number | null;
  } {
    if (!token) {
      return { hasProject: false, projectId: null, userId: null };
    }

    const projectId = JwtUtils.getProjectId(token);
    const userId = JwtUtils.getUserId(token);

    return {
      hasProject: !!projectId,
      projectId,
      userId,
    };
  }

  /**
   * Validate current project access
   */
  static validateProjectAccess(token: string | null): {
    isValid: boolean;
    hasProject: boolean;
    isExpired: boolean;
    willExpireSoon: boolean;
  } {
    if (!token) {
      return {
        isValid: false,
        hasProject: false,
        isExpired: true,
        willExpireSoon: false,
      };
    }

    const isValid = JwtUtils.isValidTokenFormat(token);
    const hasProject = JwtUtils.hasProjectAccess(token);
    const isExpired = JwtUtils.isTokenExpired(token);
    const willExpireSoon = JwtUtils.willExpireSoon(token);

    return {
      isValid,
      hasProject,
      isExpired,
      willExpireSoon,
    };
  }

  /**
   * Check if user needs to select a project
   */
  static needsProjectSelection(token: string | null): boolean {
    if (!token || JwtUtils.isTokenExpired(token)) {
      return false; // User needs to authenticate first
    }

    return !JwtUtils.hasProjectAccess(token);
  }

  /**
   * Generate project-specific URL with proper navigation parameters
   */
  static generateProjectUrl(baseUrl: string, projectId: number): string {
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set("project", projectId.toString());
    return url.pathname + url.search;
  }

  /**
   * Extract project ID from current URL
   */
  static getProjectIdFromUrl(): number | null {
    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get("project");
    return projectParam ? parseInt(projectParam, 10) : null;
  }

  /**
   * Perform project switch with timing controls and validation
   */
  static async performSafeProjectSwitch(
    projectId: number,
    currentToken: string,
    onTokenUpdate: (token: string) => void,
    retryAttempts: number = 3,
  ): Promise<ProjectSwitchResult> {
    let attempt = 0;

    while (attempt < retryAttempts) {
      attempt++;

      try {
        const result = await this.switchToProject(projectId, currentToken);

        if (!result.success) {
          if (attempt === retryAttempts) {
            return result;
          }
          // Wait before retry
          await this.delay(1000 * attempt);
          continue;
        }

        // Update token with verification
        if (result.token) {
          onTokenUpdate(result.token);

          // Verify token was set correctly
          await this.delay(100);

          // Additional verification delays
          await this.delay(100);

          // Final delay to ensure all async operations complete
          await this.delay(300);
        }

        return result;
      } catch (error) {
        console.error(`Project switch attempt ${attempt} failed:`, error);

        if (attempt === retryAttempts) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }

        await this.delay(1000 * attempt);
      }
    }

    return {
      success: false,
      error: "Max retry attempts exceeded",
    };
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
