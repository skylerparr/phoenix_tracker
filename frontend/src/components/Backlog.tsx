import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { issueService } from "../services/IssueService";
import IssueList from "./IssueList";
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

  const [weeklyAverage, setWeeklyAverage] = React.useState<number>(10);

  useEffect(() => {
    issueService.subscribeToGetAllIssues(handleIssuesChanged);
    const fetchAverage = async () => {
      const average = await issueService.getWeeklyPointsAverage();
      setWeeklyAverage(average);
    };
    fetchAverage();
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
        {expandedAcceptedIssues ? (
          <>
            <AcceptedIssuesToggle
              acceptedIssuesCount={acceptedIssues.length}
              onToggle={() =>
                setExpandedAcceptedIssues(!expandedAcceptedIssues)
              }
              enabled={expandedAcceptedIssues}
            />
            <IssueList
              issues={acceptedIssues}
              enableDragDrop={false}
              enableGrouping={false}
            />
          </>
        ) : (
          <AcceptedIssuesToggle
            acceptedIssuesCount={acceptedIssues.length}
            onToggle={() => setExpandedAcceptedIssues(!expandedAcceptedIssues)}
            enabled={expandedAcceptedIssues}
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
