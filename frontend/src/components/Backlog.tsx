import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { issueService } from "../services/IssueService";
import { Issue } from "../models/Issue";
import IssueGroup from "./IssueGroup";
import { IssueComponent } from "./IssueComponent";
import {
  STATUS_IN_PROGRESS,
  STATUS_ACCEPTED,
  STATUS_COMPLETED,
} from "../services/StatusService";

const Backlog: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [acceptedIssues, setAcceptedIssues] = useState<Issue[]>([]);
  const [inProgressIssues, setInprogressIssues] = useState<Issue[]>([]);
  const [expandedAcceptedIssues, setExpandedAcceptedIssues] =
    useState<boolean>(false);

  useEffect(() => {
    issueService.subscribeToGetAllIssues(handleIssuesChanged);
    return () => {
      issueService.unsubscribeFromGetAllIssues(handleIssuesChanged);
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

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(issues);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setIssues(items);

    const updates: [number, number][] = items.map((issue, index) => [
      issue.id,
      (index + 1) * 5,
    ]);
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
              <IssueComponent key={issue.id} issue={issue} />
            ))}
          </>
        )}
        {inProgressIssues.map((issue: Issue) => (
          <IssueComponent key={issue.id} issue={issue} />
        ))}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="issues">
            {(provided) => (
              <Box {...provided.droppableProps} ref={provided.innerRef}>
                {issues.map((issue: Issue, index: number) => (
                  <Draggable
                    key={issue.id}
                    draggableId={issue.id.toString()}
                    index={index}
                  >
                    {(provided) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <IssueComponent issue={issue} />
                      </Box>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      </Box>
    </Box>
  );
};

export default Backlog;
