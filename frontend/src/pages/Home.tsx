import React, { useEffect, useState } from "react";
import { Box, Tooltip, IconButton } from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import {
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  AcUnit,
  TaskAlt as TaskAltIcon,
  Search as SearchIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import CreateIssue from "../components/CreateIssue";
import Backlog from "../components/Backlog";
import { sessionStorage } from "../store/Session";
import { WebsocketService } from "../services/WebSocketService";
import MyIssuesComponent from "../components/MyIssuesComponent";
import SearchComponent from "../components/SearchComponent";
import AcceptedIssuesComponent from "../components/AcceptedIssuesComponent";
import IceboxIssuesComponent from "../components/IceboxIssuesComponent";

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
    component: MyIssuesComponent,
  },
  {
    tooltip: "Backlog",
    icon: <AssignmentIcon />,
    id: "backlog",
    component: Backlog,
  },
  {
    tooltip: "Ice Box",
    icon: <AcUnit />,
    id: "ice_box",
    component: IceboxIssuesComponent,
  },
  {
    tooltip: "Accepted Work",
    icon: <TaskAltIcon />,
    id: "accepted_work",
    component: AcceptedIssuesComponent,
  },
  {
    tooltip: "Search",
    icon: <SearchIcon />,
    id: "search",
    component: SearchComponent,
  },
];
const Home = () => {
  WebsocketService.connect();
  WebsocketService.subscribe();

  const [activeButtons, setActiveButtons] = useState<string[]>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.toString()) {
      const storedButtons = sessionStorage.getActiveButtons();
      return storedButtons.includes("search")
        ? storedButtons
        : [...storedButtons, "search"];
    }
    return sessionStorage.getActiveButtons();
  });

  const createParamMap = () => {
    const params = new URLSearchParams(window.location.search);
    const paramMap = new Map();
    params.forEach((value, key) => {
      paramMap.set(key, value);
    });
    return paramMap;
  };
  const [queryParams, setQueryParams] = useState(() => createParamMap());

  useEffect(() => {
    const handleLocationChange = () => {
      setQueryParams(createParamMap());
      const params = new URLSearchParams(window.location.search);
      if (params.toString() && !activeButtons.includes("search")) {
        setActiveButtons((prev) =>
          [...prev, "search"].sort((a, b) => {
            const aIndex = toolbarButtons.findIndex(
              (button) => button.id === a,
            );
            const bIndex = toolbarButtons.findIndex(
              (button) => button.id === b,
            );
            return aIndex - bIndex;
          }),
        );
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("urlchange", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("urlchange", handleLocationChange);
    };
  }, [activeButtons]);
  useEffect(() => {
    sessionStorage.setActiveButtons(activeButtons);
  }, [activeButtons]);

  const handleButtonClick = (buttonId: string) => {
    setActiveButtons((prevButtons: string[]) => {
      const newButtons = prevButtons.includes(buttonId)
        ? prevButtons.filter((id: string) => id !== buttonId)
        : [...prevButtons, buttonId];

      // Clear URL params when search tab is closed
      if (buttonId === "search" && prevButtons.includes("search")) {
        window.history.pushState({}, "", window.location.pathname);
        setQueryParams(new Map());
      }

      return newButtons.sort((a: string, b: string) => {
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
