import { useState, useEffect } from "react";
import { Issue } from "../models/Issue";
import {
  STATUS_IN_PROGRESS,
  STATUS_ACCEPTED,
  STATUS_COMPLETED,
  STATUS_DELIVERED,
} from "../services/StatusService";

export const useIssueFilter = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [acceptedIssues, setAcceptedIssues] = useState<Issue[]>([]);
  const [inProgressIssues, setInprogressIssues] = useState<Issue[]>([]);
  const [expandedAcceptedIssues, setExpandedAcceptedIssues] =
    useState<boolean>(false);

  const handleIssuesChanged = (issues: Issue[]) => {
    const accepted = issues.filter((issue) => issue.status === STATUS_ACCEPTED);
    const inProgress = issues.filter(
      (issue) =>
        issue.status === STATUS_IN_PROGRESS ||
        issue.status === STATUS_DELIVERED ||
        issue.status === STATUS_COMPLETED,
    );
    const sortedInProgress = [
      ...inProgress.filter((issue) => issue.status === STATUS_COMPLETED),
      ...inProgress.filter((issue) => issue.status === STATUS_DELIVERED),
      ...inProgress.filter((issue) => issue.status === STATUS_IN_PROGRESS),
    ];

    const prioritizable = issues.filter(
      (issue) =>
        issue.status !== STATUS_ACCEPTED &&
        issue.status !== STATUS_IN_PROGRESS &&
        issue.status !== STATUS_DELIVERED &&
        issue.status !== STATUS_COMPLETED,
    );

    const sortedAccepted = accepted.sort(
      (a, b) =>
        new Date(b.acceptedAt!).getTime() - new Date(a.acceptedAt!).getTime(),
    );
    const sortedInProgressWithDate = sortedInProgress.sort((a, b) => {
      if (
        (a.status === STATUS_COMPLETED || a.status === STATUS_DELIVERED) &&
        b.status !== STATUS_COMPLETED &&
        b.status !== STATUS_DELIVERED
      )
        return -1;
      if (
        (b.status === STATUS_COMPLETED || b.status === STATUS_DELIVERED) &&
        a.status !== STATUS_COMPLETED &&
        a.status !== STATUS_DELIVERED
      )
        return 1;
      if (a.status === STATUS_IN_PROGRESS && b.status !== STATUS_IN_PROGRESS)
        return -1;
      if (b.status === STATUS_IN_PROGRESS && a.status !== STATUS_IN_PROGRESS)
        return 1;
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    });
    setAcceptedIssues(sortedAccepted);
    setInprogressIssues(sortedInProgressWithDate);

    const sortedPrioritizable = prioritizable.sort(
      (a, b) => (a.priority ?? -1) - (b.priority ?? -1),
    );

    setIssues(sortedPrioritizable);
  };

  return {
    issues,
    setIssues,
    acceptedIssues,
    inProgressIssues,
    expandedAcceptedIssues,
    setExpandedAcceptedIssues,
    handleIssuesChanged,
  };
};
