import { useState, useEffect } from "react";
import { notificationService } from "../services/NotificationService";

export const useNotificationCount = () => {
  const [count, setCount] = useState<number>(0);

  const loadCount = async () => {
    try {
      const notificationCount =
        await notificationService.getNotificationCountForProject();
      setCount(notificationCount);
    } catch (error) {
      console.error("Error loading notification count:", error);
    }
  };

  const decrementCount = () => {
    setCount((prev) => Math.max(0, prev - 1));
  };

  useEffect(() => {
    loadCount();
  }, []);

  return { count, loadCount, decrementCount };
};
