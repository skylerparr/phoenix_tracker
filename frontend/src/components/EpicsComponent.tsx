import React, { useEffect, useState } from "react";
import { Box, Typography, TextField, Divider, Tooltip } from "@mui/material";
import { tagService } from "../services/TagService";
import { Tag } from "../models/Tag";
import { issueService } from "../services/IssueService";
import { Stars } from "@mui/icons-material";
import { Issue } from "../models/Issue";
import {
  STATUS_ACCEPTED,
  STATUS_COMPLETED,
  STATUS_IN_PROGRESS,
  STATUS_DELIVERED,
} from "../services/StatusService";
import { PROGRESS_COLORS } from "../constants";
import { searchTagsForIssue } from "./IssueComponent";
const calculatePointsAndStories = (
  issues: Issue[],
  predicate: (issue: Issue) => boolean,
) => {
  const filteredIssues = issues.filter(predicate);
  const totalPoints = issues.reduce(
    (sum, issue) => sum + (issue.points || 0),
    0,
  );
  const filteredPoints = filteredIssues.reduce(
    (sum, issue) => sum + (issue.points || 0),
    0,
  );

  return {
    points: filteredPoints,
    stories: filteredIssues.length,
    percentage: totalPoints ? (filteredPoints / totalPoints) * 100 : 0,
  };
};
const tooltipContent = (issues: Issue[]) => (
  <Box sx={{ p: 1 }}>
    {[
      {
        label: "In Progress",
        predicate: (issue: Issue) => issue.status === STATUS_IN_PROGRESS,
        color: PROGRESS_COLORS.IN_PROGRESS,
      },
      {
        label: "Completed",
        predicate: (issue: Issue) => issue.status === STATUS_COMPLETED,
        color: PROGRESS_COLORS.COMPLETED,
      },
      {
        label: "Accepted",
        predicate: (issue: Issue) => issue.status === STATUS_ACCEPTED,
        color: PROGRESS_COLORS.ACCEPTED,
      },
      {
        label: "Delivered",
        predicate: (issue: Issue) => issue.status === STATUS_DELIVERED,
        color: PROGRESS_COLORS.DELIVERED,
      },
      {
        label: "Icebox",
        predicate: (issue: Issue) => issue.isIcebox,
        color: PROGRESS_COLORS.ICEBOX,
      },
      {
        label: "Backlog",
        predicate: (issue: Issue) => !issue.isIcebox && !issue.status,
        color: PROGRESS_COLORS.BACKLOG,
      },
    ].map(({ label, predicate, color }) => {
      const { points, stories, percentage } = calculatePointsAndStories(
        issues,
        predicate,
      );
      if (percentage === 0) return null;
      return (
        <Typography key={label} sx={{ color: color }}>
          {label}: {percentage.toFixed(1)}% ({points} pts, {stories} stories)
        </Typography>
      );
    })}
  </Box>
);
const EpicsComponent: React.FC = () => {
  const [epics, setEpics] = useState<Tag[]>([]);
  const [filteredEpics, setFilteredEpics] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [issuesMap, setIssuesMap] = useState<Map<Tag, Issue[]>>(new Map());

  useEffect(() => {
    // Clear existing data first
    setIssuesMap(new Map());

    // Load initial data
    loadEpics();

    // Set up subscriptions with the callback function directly
    tagService.subscribeToGetAllTags(onEpicsUpdated);
    issueService.subscribeToGetAllIssues(onEpicsUpdated);

    // Clean up function
    return () => {
      setIssuesMap(new Map());
      tagService.unsubscribeFromGetAllTags(onEpicsUpdated);
      issueService.unsubscribeFromGetAllIssues(onEpicsUpdated);
    };
  }, []);

  const onEpicsUpdated = () => {
    loadEpics();
  };

  const loadEpics = async (): Promise<void> => {
    const fetchedEpics = await tagService.getTagsWithCounts();
    const epicTags = fetchedEpics
      .filter((tag) => tag.isEpic)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    setEpics(epicTags);
    setFilteredEpics(epicTags);

    const newIssuesMap = new Map();
    await Promise.all(
      epicTags.map(async (epic: Tag) => {
        const issues = await issueService.getIssuesByTag(epic.id);
        newIssuesMap.set(epic, issues);
      }),
    );

    setIssuesMap(newIssuesMap);
  };

  useEffect(() => {
    const filtered = epics.filter((epic: Tag) =>
      epic.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredEpics(filtered);
  }, [searchTerm, epics]);

  const calculateWidth = (
    epic: Tag,
    predicate: (issue: Issue) => boolean,
    issuesMap: Map<Tag, Issue[]>,
  ): string => {
    const issues = issuesMap.get(epic);
    if (!issues?.length) return "0%";

    const totalPoints = issues.reduce(
      (sum, issue) => sum + (issue.points || 0),
      0,
    );
    const filteredPoints = issues
      .filter(predicate)
      .reduce((sum, issue) => sum + (issue.points || 0), 0);

    return `${(filteredPoints / totalPoints) * 100}%`;
  };

  const getStatusPercentage = (
    issues: Issue[],
    predicate: (issue: Issue) => boolean,
  ): number => {
    if (!issues?.length) return 0;
    const totalPoints = issues.reduce(
      (sum, issue) => sum + (issue.points || 0),
      0,
    );
    const filteredPoints = issues
      .filter(predicate)
      .reduce((sum, issue) => sum + (issue.points || 0), 0);
    return (filteredPoints / totalPoints) * 100;
  };

  return (
    <Box sx={{ width: "100%", backgroundColor: "#f5f5f5" }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search epics..."
        value={searchTerm}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSearchTerm(e.target.value)
        }
        sx={{
          mb: 2,
          backgroundColor: "white",
          border: "1px solid #666666",
          "& .MuiInputBase-input": {
            color: "black",
          },
        }}
      />
      <Divider sx={{ bgcolor: "#666666", width: "100%" }} />
      {Array.from(issuesMap.keys()).map((epic: any) => (
        <Box key={epic.id} sx={{ width: "100%" }}>
          <Box sx={{ width: "100%", p: 2 }}>
            <Tooltip title={tooltipContent(issuesMap.get(epic) || [])} arrow>
              <Box
                sx={{
                  width: "100%",
                  bgcolor: "#e0e0e0",
                  borderRadius: 1,
                  border: "1px solid #666666",
                }}
              >
                <Box sx={{ display: "flex", width: "100%" }}>
                  <Box
                    sx={{
                      width: calculateWidth(
                        epic,
                        (issue) => issue.status === STATUS_IN_PROGRESS,
                        issuesMap,
                      ),
                      bgcolor: PROGRESS_COLORS.IN_PROGRESS,
                      height: "8px",
                      borderRadius: "4px 0 0 4px",
                    }}
                  />
                  <Box
                    sx={{
                      width: calculateWidth(
                        epic,
                        (issue) => issue.status === STATUS_DELIVERED,
                        issuesMap,
                      ),
                      bgcolor: PROGRESS_COLORS.DELIVERED,
                      height: "8px",
                    }}
                  />
                  <Box
                    sx={{
                      width: calculateWidth(
                        epic,
                        (issue) => issue.status === STATUS_ACCEPTED,
                        issuesMap,
                      ),
                      bgcolor: PROGRESS_COLORS.ACCEPTED,
                      height: "8px",
                    }}
                  />
                  <Box
                    sx={{
                      width: calculateWidth(
                        epic,
                        (issue) => issue.isIcebox,
                        issuesMap,
                      ),
                      bgcolor: PROGRESS_COLORS.ICEBOX,
                      height: "8px",
                    }}
                  />
                  <Box
                    sx={{
                      width: calculateWidth(
                        epic,
                        (issue) => !issue.isIcebox && !issue.status,
                        issuesMap,
                      ),
                      bgcolor: PROGRESS_COLORS.BACKLOG,
                      height: "8px",
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                mt: 1,
                "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
              }}
            >
              <Stars sx={{ mr: 1, color: "#673ab7" }} />
              <Typography
                onClick={() => searchTagsForIssue(epic.id)}
                sx={{
                  color: "#673ab7",
                  fontWeight: issuesMap.get(epic)?.length ? "bold" : "normal",
                  flexGrow: 1,
                  cursor: "pointer",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                {epic.name} ({issuesMap.get(epic)?.length || 0})
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ bgcolor: "#666666", width: "100%" }} />
        </Box>
      ))}
    </Box>
  );
};

export default EpicsComponent;
