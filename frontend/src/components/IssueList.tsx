import React, { useState } from "react";
import { Box } from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Issue } from "../models/Issue";
import { IssueComponent } from "./IssueComponent";
import IssueGroup from "./IssueGroup";
import ReleaseStatusBar from "./ReleaseStatusBar";

interface ReleaseData {
  release: Issue;
  totalPoints: number;
  weeksUntilRelease: number;
  expectedPointsCapacity: number;
  willComplete: boolean;
  predictedCompletionDate: Date;
}

interface IssueListProps {
  issues: Issue[];
  enableDragDrop?: boolean;
  enableGrouping?: boolean;
  onDragEnd?: (updates: [number, number][]) => void;
  releaseData?: ReleaseData[];
}

const IssueList: React.FC<IssueListProps> = ({
  issues: originalIssues,
  enableDragDrop = false,
  enableGrouping = false,
  onDragEnd,
  releaseData = [],
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

  // Helper to find appropriate position for a release status bar
  const findReleasePosition = (issue: Issue) => {
    return releaseData.find((data) => data.release.id === issue.id);
  };

  // Place release status bars at their predicted completion points in the backlog
  const getIssuesWithReleaseStatusBars = () => {
    if (!issues.length) return [];

    const result: (Issue | { isStatusBar: true; releaseData: ReleaseData })[] =
      [...issues];

    // Sort issues by priority to determine completion order
    const sortedIssuesByPriority = [...issues].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    );

    // Calculate the position in the list where each release would be completed
    releaseData.forEach((data) => {
      // Find where in the backlog the predicted completion would occur
      let totalPointsSoFar = 0;
      let insertPosition = -1;

      for (let i = 0; i < sortedIssuesByPriority.length; i++) {
        const issue = sortedIssuesByPriority[i];
        totalPointsSoFar += issue.points || 0;

        // If we've reached the total points required to hit this release's completion
        if (totalPointsSoFar >= data.totalPoints) {
          insertPosition = i;
          break;
        }
      }

      // If we found a position, insert the release bar there
      if (insertPosition >= 0 && insertPosition < result.length) {
        // Find the actual position in the result array that corresponds to this issue
        const actualPosition = result.findIndex(
          (item) =>
            !("isStatusBar" in item) &&
            item.id === sortedIssuesByPriority[insertPosition].id,
        );

        if (actualPosition >= 0) {
          // Insert the release status bar before this issue
          result.splice(actualPosition, 0, {
            isStatusBar: true,
            releaseData: data,
          });
        }
      }
    });

    return result;
  };

  const renderIssues = () => {
    if (!enableDragDrop) {
      const issuesWithStatusBars = getIssuesWithReleaseStatusBars();
      const elements: JSX.Element[] = [];

      issuesWithStatusBars.forEach((item, index) => {
        if ("isStatusBar" in item) {
          // This is a release status bar
          const releaseInfo = item.releaseData;
          elements.push(
            <Box
              key={`release-status-${releaseInfo.release.id}-pos-${index}`}
              sx={{ pointerEvents: "none" }}
            >
              <ReleaseStatusBar
                release={releaseInfo.release}
                totalPoints={releaseInfo.totalPoints}
                weeksUntilRelease={releaseInfo.weeksUntilRelease}
                expectedPointsCapacity={releaseInfo.expectedPointsCapacity}
                willComplete={releaseInfo.willComplete}
              />
            </Box>,
          );
        } else {
          // This is a regular issue
          elements.push(
            <IssueComponent
              key={item.id}
              issue={item}
              expanded={expandedIssueIds.has(item.id)}
              onToggleExpanded={() => handleExpandIssue(item.id)}
            />,
          );
        }
      });

      return elements;
    }

    return renderGroupedIssues();
  };

  const renderGroupedIssues = () => {
    const groupedIssues = groupIssuesByWeek(issues);

    // Calculate where to place the release status bars
    const releaseCompletionWeeks = new Map<number, ReleaseData[]>();

    if (releaseData.length > 0) {
      // Sort issues by priority to determine completion order
      const sortedIssuesByPriority = [...issues].sort(
        (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
      );

      // Calculate which week each release would be completed
      releaseData.forEach((data) => {
        // Calculate which week the release would be completed based on predicted completion date
        if (data.predictedCompletionDate && issues.length > 0) {
          // Try to find the closest scheduled issue to our predicted completion date
          let closestWeek = -1;
          let minDiff = Number.MAX_SAFE_INTEGER;

          // Find the closest scheduled issue to our predicted completion date
          for (const [weekNum, weekIssues] of groupedIssues) {
            for (const issue of weekIssues) {
              if (issue.scheduledAt) {
                const diff = Math.abs(
                  new Date(issue.scheduledAt).getTime() -
                    data.predictedCompletionDate.getTime(),
                );

                if (diff < minDiff) {
                  minDiff = diff;
                  closestWeek = weekNum;
                }
              }
            }
          }

          if (closestWeek !== -1) {
            if (!releaseCompletionWeeks.has(closestWeek)) {
              releaseCompletionWeeks.set(closestWeek, []);
            }
            releaseCompletionWeeks.get(closestWeek)!.push(data);
          }
        }
      });
    }

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        {groupedIssues.map(([weekNum, weekIssues]) => (
          <Box key={weekNum}>
            {/* Add any release bars for this week */}
            {releaseCompletionWeeks.has(weekNum) &&
              releaseCompletionWeeks.get(weekNum)!.map((releaseInfo, idx) => (
                <Box
                  key={`release-bar-${releaseInfo.release.id}-week-${weekNum}-${idx}`}
                  sx={{
                    zIndex: 10,
                    position: "relative",
                  }}
                >
                  <ReleaseStatusBar
                    release={releaseInfo.release}
                    totalPoints={releaseInfo.totalPoints}
                    weeksUntilRelease={releaseInfo.weeksUntilRelease}
                    expectedPointsCapacity={releaseInfo.expectedPointsCapacity}
                    willComplete={releaseInfo.willComplete}
                  />
                </Box>
              ))}

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
