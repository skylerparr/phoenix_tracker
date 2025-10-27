import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { issueService } from "../services/IssueService";
import IssueList from "./IssueList";
import { useIssueFilter } from "../hooks/useIssueFilter";
import { Issue } from "../models/Issue";

const IceboxIssuesComponent: React.FC = () => {
  const { issues, setIssues } = useIssueFilter();

  useEffect(() => {
    issueService.subscribeToGetIcebox(handleIssuesChanged);
    return () => {
      issueService.unsubscribeFromGetIcebox(handleIssuesChanged);
    };
  }, []);

  const handleIssuesChanged = (loadedIssues: Issue[]) => {
    setIssues(loadedIssues);
  };

  const handlePriorityUpdates = (updates: [number, number][]) => {
    issueService.bulkUpdatePriorities(updates);
    const sortedIssues = [...issues].sort((a, b) => {
      const updateA = updates.find(([id]) => id === a.id);
      const updateB = updates.find(([id]) => id === b.id);
      const priorityA = updateA ? updateA[1] : a.priority || 0;
      const priorityB = updateB ? updateB[1] : b.priority || 0;
      return priorityA - priorityB;
    });
    setIssues(sortedIssues);
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
            enableDragDrop={true}
            enableGrouping={true}
            onDragEnd={handlePriorityUpdates}
          />
        )}
      </Box>
    </Box>
  );
};

export default IceboxIssuesComponent;
