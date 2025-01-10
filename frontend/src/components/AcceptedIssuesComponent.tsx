import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { issueService } from "../services/IssueService";
import IssueList from "./IssueList";
import IssueGroup from "./IssueGroup";
import { useIssueFilter } from "../hooks/useIssueFilter";
import { WebsocketService } from "../services/WebSocketService";

const AcceptedIssuesComponent: React.FC = () => {
  const { issues, setIssues } = useIssueFilter();

  const fetchData = async () => {
    const loadedIssues = await issueService.getAllAccepted();
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

  const handlePriorityUpdates = (updates: [number, number][]) => {
    issueService.bulkUpdatePriorities(updates);
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
        <IssueGroup issues={issues} weeksFromNow={0} />
        <IssueList
          issues={issues}
          enableDragDrop={false}
          enableGrouping={true}
        />
      </Box>
    </Box>
  );
};

export default AcceptedIssuesComponent;
