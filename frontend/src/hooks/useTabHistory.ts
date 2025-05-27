import { useState, useCallback } from "react";

export interface TabHistoryManager {
  tabHistory: string[];
  addTab: (tabId: string) => void;
  removeTab: (tabId: string) => string | null;
  getCurrentTab: () => string | null;
  getPreviousTab: () => string | null;
  clearHistory: () => void;
}

export const useTabHistory = (): TabHistoryManager => {
  const [tabHistory, setTabHistory] = useState<string[]>([]);

  const addTab = useCallback((tabId: string) => {
    setTabHistory((prev) => {
      // Remove existing occurrence of this tab
      const filtered = prev.filter((id) => id !== tabId);
      // Add to the end (most recent)
      return [...filtered, tabId];
    });
  }, []);

  const removeTab = useCallback((tabId: string): string | null => {
    let previousTab: string | null = null;

    setTabHistory((prev) => {
      const index = prev.indexOf(tabId);
      if (index === -1) return prev;

      // Get the previous tab (the one before the removed tab)
      if (index > 0) {
        previousTab = prev[index - 1];
      } else if (prev.length > 1) {
        // If removing the first tab, get the next one
        previousTab = prev[1];
      }

      // Remove the tab from history
      return prev.filter((id) => id !== tabId);
    });

    return previousTab;
  }, []);

  const getCurrentTab = useCallback((): string | null => {
    if (tabHistory.length === 0) return null;
    return tabHistory[tabHistory.length - 1];
  }, [tabHistory]);

  const getPreviousTab = useCallback((): string | null => {
    if (tabHistory.length < 2) return null;
    return tabHistory[tabHistory.length - 2];
  }, [tabHistory]);

  const clearHistory = useCallback(() => {
    setTabHistory([]);
  }, []);

  return {
    tabHistory,
    addTab,
    removeTab,
    getCurrentTab,
    getPreviousTab,
    clearHistory,
  };
};
