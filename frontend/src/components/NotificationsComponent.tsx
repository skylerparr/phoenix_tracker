import React, { useEffect, useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { notificationService } from "../services/NotificationService";
import { Notification } from "../models/Notification";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

const NotificationsComponent: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState<number>(0);

  useEffect(() => {
    loadNotifications();
    loadNotificationCount();
  }, []);

  const loadNotifications = async () => {
    try {
      const notificationsData =
        await notificationService.getNotificationsForProject();
      setNotifications(notificationsData);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const loadNotificationCount = async () => {
    try {
      const count = await notificationService.getNotificationCountForProject();
      setNotificationCount(count);
    } catch (error) {
      console.error("Error loading notification count:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await notificationService.markNotificationAsRead(notification.id);
        // Update the local state to mark as read
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n,
          ),
        );
        // Update the count
        setNotificationCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
  };

  const handleIssueClick = (issueId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent the notification click handler
    // Open search tab with the issue ID
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set("id", issueId.toString());
    const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
    window.history.pushState({}, "", newUrl);

    // Dispatch URL change event to trigger search tab opening
    const urlChangeEvent = new CustomEvent("urlchange");
    window.dispatchEvent(urlChangeEvent);
  };

  return (
    <Box sx={{ padding: 0, width: "100%" }}>
      {notifications.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No notifications
        </Typography>
      ) : (
        notifications.map((notification) => (
          <Box
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            sx={{
              backgroundColor: notification.read
                ? "rgba(173, 216, 230, 0.3)" // Light blue background for read
                : "rgba(173, 216, 230, 0.6)", // Slightly darker blue for unread
              border: "1px solid rgba(173, 216, 230, 0.8)",
              borderRadius: 1,
              padding: 2,
              marginBottom: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              "&:hover": {
                backgroundColor: notification.read
                  ? "rgba(173, 216, 230, 0.4)"
                  : "rgba(173, 216, 230, 0.7)",
              },
            }}
          >
            {/* Read/Unread indicator */}
            <Box sx={{ marginTop: 0.5 }}>
              {notification.read ? (
                <RadioButtonUncheckedIcon
                  sx={{ fontSize: 12, color: "rgba(0, 0, 0, 0.4)" }}
                />
              ) : (
                <FiberManualRecordIcon sx={{ fontSize: 12, color: "red" }} />
              )}
            </Box>

            {/* Content */}
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: "bold",
                  color: "text.primary",
                  marginBottom: 0.5,
                }}
              >
                {notification.title}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  marginBottom: 1,
                }}
              >
                {notification.description}
              </Typography>

              {/* Issue link */}
              <Typography
                variant="body2"
                component="span"
                onClick={(e) => handleIssueClick(notification.issueId, e)}
                sx={{
                  color: "primary.main",
                  textDecoration: "underline",
                  cursor: "pointer",
                  "&:hover": {
                    color: "primary.dark",
                  },
                }}
              >
                Issue #{notification.issueId}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "text.secondary",
                  marginTop: 1,
                }}
              >
                {notification.createdAt.toLocaleDateString()}{" "}
                {notification.createdAt.toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
};

export default NotificationsComponent;
