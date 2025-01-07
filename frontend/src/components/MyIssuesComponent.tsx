import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { issueService } from "../services/IssueService";
import { Issue } from "../models/Issue";
import IssueGroup from "./IssueGroup";
import { IssueComponent } from "./IssueComponent";
import {
  STATUS_IN_PROGRESS,
  STATUS_ACCEPTED,
  STATUS_COMPLETED,
} from "../services/StatusService";

const MyIssuesComponent: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [acceptedIssues, setAcceptedIssues] = useState<Issue[]>([]);
  const [inProgressIssues, setInprogressIssues] = useState<Issue[]>([]);
  const [expandedAcceptedIssues, setExpandedAcceptedIssues] =
    useState<boolean>(false);
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    issueService.subscribeToGetMyIssues(handleIssuesChanged);
    return () => {
      issueService.unsubscribeFromGetMyIssues(handleIssuesChanged);
    };
  }, []);

  const handleIssuesChanged = (issues: Issue[]) => {
    const accepted = issues.filter((issue) => issue.status === STATUS_ACCEPTED);
    const inProgress = issues.filter(
      (issue) =>
        issue.status === STATUS_IN_PROGRESS ||
        issue.status === STATUS_COMPLETED,
    );
    const sortedInProgress = [
      ...inProgress.filter((issue) => issue.status === STATUS_COMPLETED),
      ...inProgress.filter((issue) => issue.status === STATUS_IN_PROGRESS),
    ];

    const prioritizable = issues.filter(
      (issue) =>
        issue.status !== STATUS_ACCEPTED &&
        issue.status !== STATUS_IN_PROGRESS &&
        issue.status !== STATUS_COMPLETED,
    );

    const sortedAccepted = accepted.sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );

    const sortedInProgressWithDate = sortedInProgress.sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );

    setAcceptedIssues(sortedAccepted);
    setInprogressIssues(sortedInProgressWithDate);

    const sortedPrioritizable = prioritizable.sort(
      (a, b) => (a.priority ?? -1) - (b.priority ?? -1),
    );

    setIssues(sortedPrioritizable);
  };

  const handleExpandIssue = (issueId: number) => {
    const copyOfExpandedIssueIds = new Set(expandedIssueIds);
    if (copyOfExpandedIssueIds.has(issueId)) {
      copyOfExpandedIssueIds.delete(issueId);
    } else {
      copyOfExpandedIssueIds.add(issueId);
    }
    setExpandedIssueIds(copyOfExpandedIssueIds);
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
        {!expandedAcceptedIssues ? (
          <Box
            sx={{
              border: "1px solid #ddd",
              borderRadius: 1,
              width: "100%",
              bgcolor: "#c6d9b7",
              padding: "5px",
              cursor: "pointer",
              color: "#333333",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setExpandedAcceptedIssues(true)}
          >
            Show {acceptedIssues.length} Accepted Issues
          </Box>
        ) : (
          <>
            {acceptedIssues.map((issue: Issue) => (
              <IssueComponent
                key={issue.id}
                issue={issue}
                expanded={expandedIssueIds.has(issue.id)}
                onToggleExpanded={() => handleExpandIssue(issue.id)}
              />
            ))}
          </>
        )}
        {inProgressIssues.map((issue: Issue) => (
          <IssueComponent
            key={issue.id}
            issue={issue}
            expanded={expandedIssueIds.has(issue.id)}
            onToggleExpanded={() => handleExpandIssue(issue.id)}
          />
        ))}
        {issues.map((issue: Issue) => (
          <IssueComponent
            key={issue.id}
            issue={issue}
            expanded={expandedIssueIds.has(issue.id)}
            onToggleExpanded={() => handleExpandIssue(issue.id)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default MyIssuesComponent;
