import React, { useEffect, useState } from "react";
import { Box, Tooltip, IconButton, Stack, Typography } from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import {
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  AcUnit,
  TaskAlt as TaskAltIcon,
  Search as SearchIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Sell,
  Close,
  Stars,
  AccessTime,
  Settings,
  Notes as NotesIcon,
} from "@mui/icons-material";
import CreateIssue from "../components/CreateIssue";
import Backlog from "../components/Backlog";
import { sessionStorage } from "../store/Session";
import { WebsocketService } from "../services/WebSocketService";
import MyIssuesComponent from "../components/MyIssuesComponent";
import SearchComponent, {
  PARAM_HISTORY_ISSUE_ID,
  PARAM_ID,
  PARAM_TAG,
  PARAM_USER_ID,
} from "../components/SearchComponent";
import AcceptedIssuesComponent from "../components/AcceptedIssuesComponent";
import IceboxIssuesComponent from "../components/IceboxIssuesComponent";
import ManageTagsComponent from "../components/ManageTagsComponent";
import EpicsComponent from "../components/EpicsComponent";
import HistoryComponent from "../components/HistoryComponent";
import SettingsComponent from "../components/SettingsComponent";
import { ProjectNotesComponent } from "../components/ProjectNotesComponent";

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
    tooltip: "Labels",
    icon: <Sell />,
    id: "manage_labels",
    component: ManageTagsComponent,
  },
  {
    tooltip: "Search",
    icon: <SearchIcon />,
    id: "search",
    component: SearchComponent,
  },
  {
    tooltip: "Epics",
    icon: <Stars />,
    id: "epics",
    component: EpicsComponent,
  },
  {
    tooltip: "Notes",
    icon: <NotesIcon />,
    id: "project_notes",
    component: ProjectNotesComponent,
  },
  {
    tooltip: "History",
    icon: <AccessTime />,
    id: "history",
    component: HistoryComponent,
  },
  {
    tooltip: "Settings",
    icon: <Settings />,
    id: "settings",
    component: SettingsComponent,
  },
];
const Home = () => {
  WebsocketService.connect();
  WebsocketService.subscribe();

  const [activeButtons, setActiveButtons] = useState<string[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasHistoryParam = params.has(PARAM_HISTORY_ISSUE_ID);
    const hasSearchParams =
      params.has(PARAM_ID) ||
      params.has(PARAM_TAG) ||
      params.has(PARAM_USER_ID);

    const storedButtons = sessionStorage.getActiveButtons();
    let newButtons = [...storedButtons];

    if (hasHistoryParam) {
      newButtons = Array.from(new Set([...newButtons, "history"]));
    }
    if (hasSearchParams) {
      newButtons = Array.from(new Set([...newButtons, "search"]));
    }

    return newButtons.sort((a, b) => {
      const aIndex = toolbarButtons.findIndex((button) => button.id === a);
      const bIndex = toolbarButtons.findIndex((button) => button.id === b);
      return aIndex - bIndex;
    });
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
      const hasHistoryParam = params.has(PARAM_HISTORY_ISSUE_ID);
      const hasSearchParams =
        params.has(PARAM_ID) ||
        params.has(PARAM_TAG) ||
        params.has(PARAM_USER_ID);

      // Close search tab if no search params
      if (!hasSearchParams && activeButtons.includes("search")) {
        setActiveButtons((prev) => prev.filter((id) => id !== "search"));
      }

      // Close history tab if no history param
      if (!hasHistoryParam && activeButtons.includes("history")) {
        setActiveButtons((prev) => prev.filter((id) => id !== "history"));
      }

      if (hasSearchParams && !activeButtons.includes("search")) {
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
      if (hasHistoryParam && !activeButtons.includes("history")) {
        setActiveButtons((prev) =>
          [...prev, "history"].sort((a, b) => {
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
      const clearUrlParams = (paramsToDelete: string[], isHistory = false) => {
        const currentParams = new URLSearchParams(window.location.search);
        paramsToDelete.forEach((param) => currentParams.delete(param));
        const newSearch = currentParams.toString();
        const newUrl = newSearch
          ? `${window.location.pathname}?${newSearch}`
          : window.location.pathname;
        window.history.pushState({}, "", newUrl);
        if (!isHistory) {
          setQueryParams(new Map());
        }
      };

      // Clear URL params when search tab is closed
      if (buttonId === "search" && prevButtons.includes("search")) {
        clearUrlParams(["id", "tagId", "userId"]);
      }
      // Clear URL params when history tab is closed
      if (buttonId === "history" && prevButtons.includes("history")) {
        clearUrlParams(["historyIssueId"], true);
      }

      return newButtons.sort((a: string, b: string) => {
        const aIndex = toolbarButtons.findIndex((button) => button.id === a);
        const bIndex = toolbarButtons.findIndex((button) => button.id === b);
        return aIndex - bIndex;
      });
    });
  };

  const handleBackToProjects = () => {
    window.history.pushState({}, "", "/projects");
    const navigationEvent = new PopStateEvent("popstate");
    window.dispatchEvent(navigationEvent);
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
          <Tooltip title="Back to Projects" placement="right">
            <IconButton
              onClick={handleBackToProjects}
              sx={{
                color: "inherit",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
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
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  paddingLeft: "8px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                  flexShrink: 0,
                }}
              >
                <Typography variant="subtitle1">
                  {toolbarButtons.find((btn) => btn.id === buttonId)?.tooltip}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleButtonClick(buttonId)}
                  sx={{ color: "text.primary" }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Stack>
              <Box
                sx={{
                  height: 0,
                  flexGrow: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
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
            </Box>
          ))}
        </Box>
      </Box>
    </RequireAuth>
  );
};

export default Home;
