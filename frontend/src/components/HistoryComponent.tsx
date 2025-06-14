import React from "react";
import { Box, Typography, Paper, Stack, Avatar } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { User } from "../models/User";
import { History } from "../models/History";
import { historyService } from "../services/HistoryService";
import { userService } from "../services/UserService";
import { PARAM_HISTORY_ISSUE_ID } from "./SearchComponent";
import { useSearchParams } from "../hooks/useSearchParams";

const theme = createTheme({
  palette: {
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#24292e",
      secondary: "#586069",
    },
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    subtitle1: {
      fontSize: "14px",
      fontWeight: 600,
    },
    body2: {
      fontSize: "14px",
      lineHeight: 1.5,
    },
    caption: {
      fontSize: "12px",
      color: "#586069",
    },
  },
});

interface CommentProps {
  history: History;
  user: User;
}

const Comment: React.FC<CommentProps> = ({ user, history }) => (
  <Box
    className="flex items-start gap-3"
    sx={{ padding: "3px", borderBottom: "1px solid #424242" }}
  >
    <Box className="flex-grow">
      <Box className="flex items-center justify-end mb-1">
        <Box className="flex items-center gap-1">
          <Typography
            component="span"
            sx={{
              fontWeight: 600,
              color: "#24292e",
              fontSize: "14px",
            }}
          >
            {user.name}{" "}
          </Typography>
          <Typography
            component="span"
            sx={{
              color: "#586069",
              fontSize: "14px",
            }}
          >
            {history.action}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: "#6a737d",
            fontSize: "12px",
            textAlign: "right",
            width: "100%",
          }}
        >
          {new Date(history.createdAt).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </Typography>
      </Box>
    </Box>
  </Box>
);
const HistoryComponent: React.FC = () => {
  const [histories, setHistories] = React.useState<History[]>([]);
  const [userMap, setUserMap] = React.useState<Map<number, User>>(new Map());
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const fetchHistories = async () => {
      const id = searchParams.get(PARAM_HISTORY_ISSUE_ID);
      if (!id) return;
      const fetchedHistories = await historyService.getHistoryByIssue(
        parseInt(id),
      );
      const userMap = new Map<number, User>();
      for (const history of fetchedHistories) {
        if (!userMap.has(history.userId)) {
          const user = await userService.getUser(history.userId);
          if (user) {
            userMap.set(history.userId, user);
          }
        }
      }
      setUserMap(userMap);
      setHistories(fetchedHistories);
    };
    fetchHistories();
  }, [searchParams]);

  return (
    <ThemeProvider theme={theme}>
      {histories.length === 0 ? (
        <Typography>Issue not found</Typography>
      ) : (
        <Stack
          className="w-full max-w-2xl"
          sx={{
            bgcolor: "background.paper",
            border: "1px solid #e1e4e8",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          {histories.map((history, index) => (
            <Comment
              key={index}
              history={history}
              user={userMap.get(history.userId)!}
            />
          ))}
        </Stack>
      )}
    </ThemeProvider>
  );
};

export default HistoryComponent;
