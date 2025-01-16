import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { issueService } from "../services/IssueService";
import IssueList from "./IssueList";
import IssueGroup from "./IssueGroup";
import { useIssueFilter } from "../hooks/useIssueFilter";
import { WebsocketService } from "../services/WebSocketService";
import { Issue } from "../models/Issue";

const AcceptedIssuesComponent: React.FC = () => {
  const { issues, setIssues } = useIssueFilter();

  const getWeekNumber = (date: Date): number => {
    const now = new Date();
    const start = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday of current week
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  };

  const groupIssuesByWeek = (issues: Issue[]) => {
    const groupedIssues = new Map<number, Issue[]>();

    issues.forEach((issue) => {
      const weekNum = getWeekNumber(new Date(issue.acceptedAt!));
      if (!groupedIssues.has(weekNum)) {
        groupedIssues.set(weekNum, []);
      }
      groupedIssues.get(weekNum)?.push(issue);
    });

    return Array.from(groupedIssues.entries()).sort(
      ([weekA], [weekB]) => weekB - weekA,
    );
  };

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
        {groupIssuesByWeek(issues).map(([weekNum, weekIssues]) => (
          <Box key={weekNum}>
            <IssueGroup issues={weekIssues} weeksFromNow={weekNum} />
            <IssueList
              issues={weekIssues}
              enableDragDrop={false}
              enableGrouping={true}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AcceptedIssuesComponent;
