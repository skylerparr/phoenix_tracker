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

    const allIssues = Array.from(issues);
    const groupedIssues = groupIssuesByWeek(allIssues);

    const sourceWeek = parseInt(result.source.droppableId.split("-")[1]);
    const targetWeek = parseInt(result.destination.droppableId.split("-")[1]);

    const sourceGroup =
      groupedIssues.find(([week]) => week === sourceWeek)?.[1] || [];
    const targetGroup =
      groupedIssues.find(([week]) => week === targetWeek)?.[1] || [];

    const [movedItem] = sourceGroup.splice(result.source.index, 1);

    const baseDate = new Date(issues[0].scheduledAt!);
    const newScheduledDate = new Date(baseDate);
    newScheduledDate.setDate(baseDate.getDate() + targetWeek * 7);
    movedItem.scheduledAt = newScheduledDate;

    targetGroup.splice(result.destination.index, 0, movedItem);

    const flattenedIssues = groupedIssues.flatMap(([_, issues]) => issues);
    const updatedIssues = flattenedIssues.map((issue, index) => ({
      ...issue,
      priority: (index + 1) * 10,
    }));

    const updates: [number, number][] = updatedIssues
      .map((issue) => [issue.id, issue.priority])
      .filter((update): update is [number, number] => update[1] !== null);

    setIssues(updatedIssues);
    onDragEnd(updates);
  };

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

  const renderIssues = () => {
    if (!enableDragDrop) {
      return issues.map((issue: Issue) => (
        <IssueComponent
          key={issue.id}
          issue={issue}
          expanded={expandedIssueIds.has(issue.id)}
          onToggleExpanded={() => handleExpandIssue(issue.id)}
        />
      ));
    }

    return renderGroupedIssues();
  };

  const renderGroupedIssues = () => {
    const groupedIssues = groupIssuesByWeek(issues);

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        {groupedIssues.map(([weekNum, weekIssues]) => (
          <Box key={weekNum}>
            <Droppable droppableId={`week-${weekNum}`} direction="vertical">
              {(provided) => (
                <Box {...provided.droppableProps} ref={provided.innerRef}>
                  {weekIssues.map((issue: Issue, index: number) => (
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
            <IssueGroup weeksFromNow={weekNum} issues={weekIssues} />
          </Box>
        ))}
      </DragDropContext>
    );
  };

  return <Box className="issue-list-container">{renderIssues()}</Box>;
};

export default IssueList;
