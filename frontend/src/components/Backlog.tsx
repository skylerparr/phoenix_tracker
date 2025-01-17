import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { issueService } from "../services/IssueService";
import IssueList from "./IssueList";
import IssueGroup from "./IssueGroup";
import { useIssueFilter } from "../hooks/useIssueFilter";
import AcceptedIssuesToggle from "./AcceptedIssuesToggle";

const Backlog: React.FC = () => {
  const {
    issues,
    setIssues,
    acceptedIssues,
    inProgressIssues,
    expandedAcceptedIssues,
    setExpandedAcceptedIssues,
    handleIssuesChanged,
  } = useIssueFilter();

  useEffect(() => {
    issueService.subscribeToGetAllIssues(handleIssuesChanged);
    return () => {
      issueService.unsubscribeFromGetAllIssues(handleIssuesChanged);
    };
  }, []);
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
          width: "100%",
        }}
      >
        <IssueGroup issues={issues} weeksFromNow={0} />
        {expandedAcceptedIssues ? (
          <IssueList
            issues={acceptedIssues}
            enableDragDrop={false}
            enableGrouping={false}
          />
        ) : (
          <AcceptedIssuesToggle
            acceptedIssuesCount={acceptedIssues.length}
            onToggle={() => setExpandedAcceptedIssues(true)}
          />
        )}
        <IssueList
          issues={inProgressIssues}
          enableDragDrop={false}
          enableGrouping={false}
        />
        <IssueList
          issues={issues}
          enableDragDrop={true}
          enableGrouping={true}
          onDragEnd={handlePriorityUpdates}
        />
      </Box>
    </Box>
  );
};

export default Backlog;
