import React, { createContext, useContext, ReactNode } from "react";
import { useMobileDetection } from "../hooks/useMobileDetection";
import { useTabHistory, TabHistoryManager } from "../hooks/useTabHistory";

interface MobileContextType {
  isMobile: boolean;
  tabHistory: TabHistoryManager;
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

interface MobileProviderProps {
  children: ReactNode;
}

export const MobileProvider: React.FC<MobileProviderProps> = ({ children }) => {
  const isMobile = useMobileDetection();
  const tabHistory = useTabHistory();

  return (
    <MobileContext.Provider value={{ isMobile, tabHistory }}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobile = (): MobileContextType => {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error("useMobile must be used within a MobileProvider");
  }
  return context;
};
