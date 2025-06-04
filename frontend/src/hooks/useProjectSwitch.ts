import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectManager, ProjectSwitchResult } from "../utils/ProjectManager";
import { sessionStorage } from "../store/Session";

export interface UseProjectSwitchResult {
  switching: boolean;
  error: string | null;
  switchToProject: (projectId: number) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Custom hook for managing project switching
 * Encapsulates all project switch logic including token management and navigation
 */
export function useProjectSwitch(): UseProjectSwitchResult {
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const switchToProject = useCallback(
    async (projectId: number): Promise<boolean> => {
      setSwitching(true);
      setError(null);

      try {
        const currentToken = sessionStorage.getToken();

        if (!currentToken) {
          throw new Error("No authentication token available");
        }

        // Use the centralized project manager
        const result: ProjectSwitchResult =
          await ProjectManager.performSafeProjectSwitch(
            projectId,
            currentToken,
            (newToken: string) => {
              // Update session storage with new token
              sessionStorage.updateUserToken(newToken);
            },
          );

        if (!result.success) {
          throw new Error(result.error || "Failed to switch project");
        }

        // Navigate to home with project parameter
        const projectUrl = ProjectManager.generateProjectUrl(
          "/home",
          projectId,
        );
        navigate(projectUrl);

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Project switch failed:", errorMessage);
        setError(errorMessage);
        return false;
      } finally {
        setSwitching(false);
      }
    },
    [navigate],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    switching,
    error,
    switchToProject,
    clearError,
  };
}

/**
 * Hook for detecting project changes in the URL
 */
export function useProjectChangeDetection(
  onProjectChange: (projectId: number) => void,
): void {
  const navigate = useNavigate();

  // This hook would typically use useEffect to listen for URL changes
  // For now, keeping it simple as a placeholder for future expansion
}

/**
 * Hook for validating current project access
 */
export function useProjectValidation() {
  const getCurrentProjectStatus = useCallback(() => {
    const token = sessionStorage.getToken();

    return ProjectManager.validateProjectAccess(token);
  }, []);

  const getCurrentProjectInfo = useCallback(() => {
    const token = sessionStorage.getToken();

    return ProjectManager.getCurrentProjectInfo(token);
  }, []);

  const needsProjectSelection = useCallback(() => {
    const token = sessionStorage.getToken();

    return ProjectManager.needsProjectSelection(token);
  }, []);

  return {
    getCurrentProjectStatus,
    getCurrentProjectInfo,
    needsProjectSelection,
  };
}
