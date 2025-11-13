import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { userService } from "../services/UserService";
import { User } from "../models/User";
import DeleteIcon from "@mui/icons-material/Delete";
import { sessionStorage } from "../store/Session";
import { projectService } from "../services/ProjectService";
import { PushNotificationService } from "../services/PushNotificationService";

const SettingsComponent: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [projectOwnerUser, setProjectOwnerUser] = useState<User | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] =
    useState<boolean>(false);
  const [notificationsSupported, setNotificationsSupported] =
    useState<boolean>(false);

  useEffect(() => {
    loadUsers();
    // Check notification support and status
    const supported = PushNotificationService.isSupported();
    setNotificationsSupported(supported);
    if (supported) {
      const enabled = PushNotificationService.isEnabled();
      setNotificationsEnabled(enabled);
    }
  }, []);

  const loadUsers = async () => {
    const loadedUsers = await userService.getAllUsers();
    const currentUserId = sessionStorage.getSession().user?.id;
    const filteredUsers = loadedUsers.filter(
      (user) => user.id !== currentUserId,
    );
    setUsers(filteredUsers);
    const currentUser = loadedUsers.find(
      (user) => user.id === sessionStorage.getSession().user?.id,
    );
    if (currentUser?.isProjectOwner) {
      setProjectOwnerUser(currentUser);
    }
  };

  const handleInvite = async () => {
    if (email.trim()) {
      try {
        await userService.inviteUser(email);
      } catch (error) {
        // Ignoring the error
      }
      setEmail("");
      window.location.reload();
    }
  };

  const handleRemoveUser = async (userId: number) => {
    await userService.removeUser(userId);
    window.location.reload();
  };

  const handleDelete = async () => {
    const projectId = sessionStorage.getCurrentProjectId();
    if (!projectId) {
      console.error("Project ID is undefined");
      return;
    }
    const confirmed = window.confirm(
      "Are you sure you want to delete this project? This action cannot be undone.",
    );
    if (confirmed) {
      await projectService.deleteProject(projectId);
      window.location.href = "/projects";
    }
  };

  const handleNotificationToggle = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const isEnabled = event.target.checked;
    if (isEnabled) {
      // Request permission
      const granted = await PushNotificationService.requestPermission();
      if (granted) {
        setNotificationsEnabled(true);
        // Send a test notification
        await PushNotificationService.send({
          title: "Notifications Enabled",
          body: "You will now receive browser notifications.",
        });
      } else {
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  return (
    <Box
      sx={{
        padding: 3,
        margin: "0 auto",
        backgroundColor: "#dfdfdf",
        height: "100%",
        overflow: "auto",
      }}
    >
      <Typography variant="h5" sx={{ mb: 3, color: "black" }}>
        Project Settings
      </Typography>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "black" }}>
          Invite User
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter email address"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                handleInvite();
              }
            }}
            sx={{
              color: "black",
              "& .MuiInputBase-input": { color: "black" },
              border: "1px solid black",
            }}
          />
          <Button
            variant="contained"
            onClick={handleInvite}
            sx={{
              bgcolor: "#000080",
              "&:hover": {
                bgcolor: "#0000A0",
              },
            }}
          >
            <Typography sx={{ color: "White" }}>Invite</Typography>
          </Button>
        </Box>
      </Box>
      <Divider sx={{ borderColor: "#424242", my: 3 }} />
      <Typography variant="h6" sx={{ mb: 2, color: "black" }}>
        Notifications
      </Typography>
      {notificationsSupported ? (
        <FormControlLabel
          control={
            <Switch
              checked={notificationsEnabled}
              onChange={handleNotificationToggle}
              color="primary"
            />
          }
          label={
            <Typography sx={{ color: "black" }}>
              Enable Browser Notifications
            </Typography>
          }
        />
      ) : (
        <Typography sx={{ color: "#666666", fontSize: "0.875rem" }}>
          Browser notifications are not supported on this device
        </Typography>
      )}
      <Divider sx={{ borderColor: "#424242", my: 3 }} />
      <Typography variant="h6" sx={{ mb: 2, color: "black" }}>
        Project Members
      </Typography>
      <List>
        {users.map((user) => (
          <ListItem
            key={user.id}
            secondaryAction={
              !user.isProjectOwner && (
                <IconButton
                  edge="end"
                  onClick={() => handleRemoveUser(user.id)}
                >
                  <DeleteIcon sx={{ color: "black" }} />
                </IconButton>
              )
            }
          >
            <ListItemText
              primary={
                <Typography sx={{ color: "black" }}>{user.name}</Typography>
              }
              secondary={
                <Typography sx={{ color: "black" }}>{user.email}</Typography>
              }
            />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ borderColor: "#424242", my: 3 }} />
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
        <Button
          variant="contained"
          onClick={() => (window.location.href = "/logout")}
          sx={{
            bgcolor: "#666666",
            "&:hover": {
              bgcolor: "#444444",
            },
          }}
        >
          <Typography sx={{ color: "white" }}>Logout</Typography>
        </Button>
      </Box>
      {projectOwnerUser && (
        <>
          <Divider sx={{ borderColor: "#424242", my: 3 }} />
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleDelete}
              sx={{
                bgcolor: "#a71f39",
                "&:hover": {
                  bgcolor: "#8a1930",
                },
              }}
            >
              <Typography sx={{ color: "white" }}>Delete Project</Typography>
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SettingsComponent;
