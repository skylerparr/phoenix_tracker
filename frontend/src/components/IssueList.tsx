import React, { useState } from "react";
import { Box } from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Issue } from "../models/Issue";
import { IssueComponent } from "./IssueComponent";
import IssueGroup from "./IssueGroup";

interface IssueListProps {
  issues: Issue[];
  enableDragDrop?: boolean;
  enableGrouping?: boolean;
  onDragEnd?: (updates: [number, number][]) => void;
}

const IssueList: React.FC<IssueListProps> = ({
  issues: originalIssues,
  enableDragDrop = false,
  enableGrouping = false,
  onDragEnd,
}) => {
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<number>>(
    new Set(),
  );
  const [issues, setIssues] = useState<Issue[]>([]);

  React.useEffect(() => {
    setIssues(originalIssues);
  }, [originalIssues]);

  const handleExpandIssue = (issueId: number) => {
    const copyOfExpandedIssueIds = new Set(expandedIssueIds);
    if (copyOfExpandedIssueIds.has(issueId)) {
      copyOfExpandedIssueIds.delete(issueId);
    } else {
      copyOfExpandedIssueIds.add(issueId);
    }
    setExpandedIssueIds(copyOfExpandedIssueIds);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !onDragEnd) return;

    const items = Array.from(issues);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates: [number, number][] = items.map((issue, index) => [
      issue.id,
      (index + 1) * 5,
    ]);
    setIssues(items);
    onDragEnd(updates);
  };

  const renderIssues = () => {
    const issueList = issues.map((issue: Issue, index: number) => {
      const issueComponent = (
        <IssueComponent
          key={issue.id}
          issue={issue}
          expanded={expandedIssueIds.has(issue.id)}
          onToggleExpanded={() => handleExpandIssue(issue.id)}
        />
      );

      if (!enableDragDrop) return issueComponent;

      return (
        <Draggable
          key={issue.id}
          draggableId={issue.id.toString()}
          index={index}
        >
          {(provided: any) => (
            <Box
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              {issueComponent}
            </Box>
          )}
        </Draggable>
      );
    });
    if (!enableDragDrop) return issueList;

    return (
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
                      <IssueComponent
                        issue={issue}
                        expanded={expandedIssueIds.has(issue.id)}
                        onToggleExpanded={() => handleExpandIssue(issue.id)}
                      />
                    </Box>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

  return <Box className="issue-list-container">{renderIssues()}</Box>;
};

export default IssueList;
