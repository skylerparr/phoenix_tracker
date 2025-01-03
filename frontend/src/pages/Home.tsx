import React, { useEffect, useState } from "react";
import { Box, Tooltip, IconButton } from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import HomeIcon from "@mui/icons-material/Home";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ArchiveIcon from "@mui/icons-material/Archive";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CreateIssue from "../components/CreateIssue";
import Backlog from "../components/Backlog";
import { sessionStorage } from "../store/Session";
import { WebsocketService } from "../services/WebSocketService";

const toolbarButtons = [
  {
    tooltip: "Create Task",
    icon: <AddIcon />,
    id: "create_task",
    component: CreateIssue,
  },
  {
    tooltip: "My Work",
    icon: <HomeIcon />,
    id: "my_work",
    component: Box,
  },
  {
    tooltip: "Backlog",
    icon: <AssignmentIcon />,
    id: "backlog",
    component: Backlog,
  },
  {
    tooltip: "Ice Box",
    icon: <ArchiveIcon />,
    id: "profile",
    component: Box,
  },
  {
    tooltip: "Finished Work",
    icon: <TaskAltIcon />,
    id: "finished_work",
    component: Box,
  },
  {
    tooltip: "Search",
    icon: <SearchIcon />,
    id: "search",
    component: Box,
  },
];
const Home = () => {
  WebsocketService.connect();
  WebsocketService.subscribe();

  const [activeButtons, setActiveButtons] = useState<string[]>(() => {
    return sessionStorage.getActiveButtons();
  });

  useEffect(() => {
    sessionStorage.setActiveButtons(activeButtons);
  }, [activeButtons]);

  const handleButtonClick = (buttonId: string) => {
    setActiveButtons((prevButtons) => {
      const newButtons = prevButtons.includes(buttonId)
        ? prevButtons.filter((id) => id !== buttonId)
        : [...prevButtons, buttonId];
      return newButtons.sort((a, b) => {
        const aIndex = toolbarButtons.findIndex((button) => button.id === a);
        const bIndex = toolbarButtons.findIndex((button) => button.id === b);
        return aIndex - bIndex;
      });
    });
  };

  return (
    <RequireAuth>
      <Box sx={{ display: "flex" }}>
        <Box
          sx={{
            width: "64px",
            backgroundColor: "background.paper",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 2,
            gap: 2,
          }}
        >
          {toolbarButtons.map((button) => (
            <Tooltip key={button.id} title={button.tooltip} placement="right">
              <IconButton
                onClick={() => handleButtonClick(button.id)}
                sx={{
                  backgroundColor: activeButtons.includes(button.id)
                    ? "primary.main"
                    : "transparent",
                  color: activeButtons.includes(button.id)
                    ? "white"
                    : "inherit",
                  "&:hover": {
                    backgroundColor: activeButtons.includes(button.id)
                      ? "primary.dark"
                      : "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                {button.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "row",
            gap: "3px",
          }}
        >
          {activeButtons.map((buttonId) => (
            <Box
              key={buttonId}
              sx={{
                border: "1px solid navy",
                backgroundColor: "#333333",
                height: "100vh",
                flexGrow: 1,
                minWidth: "250px",
                maxWidth: "800px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {toolbarButtons.map((button) => {
                if (button.id === buttonId) {
                  const Component = button.component;
                  return <Component key={button.id} />;
                }
                return null;
              })}
            </Box>
          ))}
        </Box>{" "}
      </Box>{" "}
    </RequireAuth>
  );
};

export default Home;
