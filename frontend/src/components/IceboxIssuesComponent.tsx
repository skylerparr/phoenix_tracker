import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { issueService } from "../services/IssueService";
import IssueList from "./IssueList";
import { useIssueFilter } from "../hooks/useIssueFilter";
import { WebsocketService } from "../services/WebSocketService";

const IceboxIssuesComponent: React.FC = () => {
  const { issues, setIssues } = useIssueFilter();

  const fetchData = async () => {
    const loadedIssues = await issueService.getAllIcebox();
    setIssues(loadedIssues);
  };

  useEffect(() => {
    fetchData();

    WebsocketService.unsubscribeToIssueUpdatedEvent(handleIssueUpdated);
    WebsocketService.subscribeToIssueUpdatedEvent(handleIssueUpdated);
    return () => {
      WebsocketService.unsubscribeToIssueUpdatedEvent(handleIssueUpdated);
    };
  }, []);

  const handleIssueUpdated = async () => {
    fetchData();
  };
  return (
    <Box className="backlog-container">
      <Box
        className="backlog-content"
        sx={{
          maxHeight: "100vh",
          overflowY: "auto",
          width: "100%",
        }}
      >
        {issues.length === 0 ? (
          <Typography>There are no iceboxed issues</Typography>
        ) : (
          <IssueList
            issues={issues}
            enableDragDrop={false}
            enableGrouping={true}
          />
        )}
      </Box>
    </Box>
  );
};

export default IceboxIssuesComponent;
