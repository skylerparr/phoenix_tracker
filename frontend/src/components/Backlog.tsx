import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { issueService } from "../services/IssueService";
import IssueList from "./IssueList";
import { useIssueFilter } from "../hooks/useIssueFilter";
import AcceptedIssuesToggle from "./AcceptedIssuesToggle";
import { WORK_TYPE_RELEASE } from "../models/Issue";
import ReleaseStatusBar from "./ReleaseStatusBar";

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
  }, [handleIssuesChanged]);

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

      releaseData.push({
        release,
        totalPoints,
        weeksUntilRelease,
        expectedPointsCapacity,
        willComplete: expectedPointsCapacity >= totalPoints,
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
        {/* Display release status bars for upcoming releases */}
        {releaseIssues.map((releaseData, index) => (
          <ReleaseStatusBar
            key={`release-status-${releaseData.release.id}`}
            release={releaseData.release}
            totalPoints={releaseData.totalPoints}
            weeksUntilRelease={releaseData.weeksUntilRelease}
            expectedPointsCapacity={releaseData.expectedPointsCapacity}
            willComplete={releaseData.willComplete}
          />
        ))}

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
