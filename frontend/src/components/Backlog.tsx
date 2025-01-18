import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { issueService } from "../services/IssueService";
import IssueList from "./IssueList";
import IssueGroup from "./IssueGroup";
import { useIssueFilter } from "../hooks/useIssueFilter";
import AcceptedIssuesToggle from "./AcceptedIssuesToggle";
import { Issue } from "../models/Issue";

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

  const getWeekNumber = (date: Date): number => {
    const baseDate = new Date(issues[0].scheduledAt!);
    baseDate.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const diff = targetDate.getTime() - baseDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  };
  const groupIssuesByWeek = (issues: Issue[]) => {
    if (!issues.length) return [];

    const groupedIssues = new Map<number, Issue[]>();

    issues.forEach((issue) => {
      if (issue.scheduledAt) {
        const weekNum = getWeekNumber(new Date(issue.scheduledAt));
        if (!groupedIssues.has(weekNum)) {
          groupedIssues.set(weekNum, []);
        }
        groupedIssues.get(weekNum)?.push(issue);
      }
    });

    const result = Array.from(groupedIssues.entries()).sort(
      ([weekA], [weekB]) => weekA - weekB,
    );
    return result;
  };
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
        {groupIssuesByWeek(issues).map(([weekNum, weekIssues]) => {
          return (
            <Box key={weekNum}>
              <IssueGroup issues={weekIssues} weeksFromNow={weekNum} />
              <IssueList
                issues={weekIssues}
                enableDragDrop={true}
                enableGrouping={true}
                onDragEnd={handlePriorityUpdates}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default Backlog;
