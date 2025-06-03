import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { issueService } from "../services/IssueService";
import IssueList from "./IssueList";
import { useIssueFilter } from "../hooks/useIssueFilter";
import AcceptedIssuesToggle from "./AcceptedIssuesToggle";
import { WORK_TYPE_RELEASE } from "../models/Issue";

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
  const [releaseIssues, setReleaseIssues] = React.useState<any[]>([]);

  useEffect(() => {
    const fetchAverage = async () => {
      const average = await issueService.getWeeklyPointsAverage();
      setWeeklyAverage(average);
    };
    fetchAverage();
  }, []);

  useEffect(() => {
    issueService.subscribeToGetAllIssues(handleIssuesChanged);
    return () => {
      issueService.unsubscribeFromGetAllIssues(handleIssuesChanged);
    };
  }, []);

  // Find upcoming releases and calculate if we'll meet them
  useEffect(() => {
    // Process releases only when we have issues and a weekly average
    if (issues.length === 0 || weeklyAverage <= 0) return;

    const now = new Date();
    const releaseData = [];

    // Find all release issues with future target dates
    const futureReleases = issues
      .filter(
        (issue) =>
          issue.workType === WORK_TYPE_RELEASE &&
          issue.targetReleaseAt &&
          new Date(issue.targetReleaseAt) > now,
      )
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const release of futureReleases) {
      const releaseIndex = issues.findIndex((i) => i.id === release.id);
      if (releaseIndex === -1) continue;

      // Get all issues above this release in the backlog
      const issuesBeforeRelease = issues.slice(0, releaseIndex);

      // Calculate total points remaining
      const totalPoints = issuesBeforeRelease.reduce(
        (sum, issue) => sum + (issue.points || 0),
        0,
      );

      // Calculate weeks until release
      const weeksUntilRelease = Math.ceil(
        (new Date(release.targetReleaseAt!).getTime() - now.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );

      // Calculate expected points we can complete by release date
      const expectedPointsCapacity = weeklyAverage * weeksUntilRelease;

      // Calculate the predicted completion date
      // If we can complete totalPoints / weeklyAverage weeks from now
      const predictedCompletionWeeks = Math.ceil(totalPoints / weeklyAverage);
      const predictedCompletionDate = new Date(now);
      predictedCompletionDate.setDate(
        predictedCompletionDate.getDate() + predictedCompletionWeeks * 7,
      );

      releaseData.push({
        release,
        totalPoints,
        weeksUntilRelease,
        expectedPointsCapacity,
        willComplete: expectedPointsCapacity >= totalPoints,
        predictedCompletionDate,
      });
    }

    setReleaseIssues(releaseData);
  }, [issues, weeklyAverage]);

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
        <Box
          sx={{
            backgroundColor: "#888888",
            padding: "4px 8px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2">Weekly Average:</Typography>
          <Typography variant="body2">
            {Math.round(weeklyAverage)} points
          </Typography>
        </Box>

        {expandedAcceptedIssues ? (
          <>
            <AcceptedIssuesToggle
              acceptedIssuesCount={acceptedIssues.length}
              onToggle={() =>
                setExpandedAcceptedIssues(!expandedAcceptedIssues)
              }
              enabled={expandedAcceptedIssues}
              points={acceptedIssues.reduce(
                (sum: number, issue: { points?: number }) =>
                  sum + (issue.points || 0),
                0,
              )}
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
            points={acceptedIssues.reduce(
              (sum: number, issue: { points?: number }) =>
                sum + (issue.points || 0),
              0,
            )}
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
          releaseData={releaseIssues}
        />
      </Box>
    </Box>
  );
};

export default Backlog;
