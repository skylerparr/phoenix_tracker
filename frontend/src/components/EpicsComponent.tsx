import React, { useEffect, useState } from "react";
import { Box, Typography, TextField, IconButton, Divider } from "@mui/material";
import { tagService } from "../services/TagService";
import { Tag } from "../models/Tag";
import { issueService } from "../services/IssueService";
import { Stars } from "@mui/icons-material";
import { Issue } from "../models/Issue";
import {
  STATUS_ACCEPTED,
  STATUS_COMPLETED,
  STATUS_IN_PROGRESS,
} from "../services/StatusService";

const EpicsComponent: React.FC = () => {
  const [epics, setEpics] = useState<Tag[]>([]);
  const [filteredEpics, setFilteredEpics] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [issuesMap, setIssuesMap] = useState<Map<Tag, Issue[]>>(new Map());

  useEffect(() => {
    loadEpics();
    tagService.subscribeToGetAllTags(onEpicsUpdated);
    issueService.subscribeToGetAllIssues(onEpicsUpdated);
    return () => {
      tagService.unsubscribeFromGetAllTags(onEpicsUpdated);
      issueService.unsubscribeFromGetAllIssues(onEpicsUpdated);
    };
  }, []);

  const onEpicsUpdated = () => {
    loadEpics();
  };

  const loadEpics = async (): Promise<void> => {
    const fetchedEpics = await tagService.getTagsWithCounts();
    const epicTags = fetchedEpics.filter((tag) => tag.isEpic);
    setEpics(epicTags);
    setFilteredEpics(epicTags);
    const issuesPromises = epicTags.map((epic: Tag) =>
      issueService.getIssuesByTag(epic.id).then((issues) => {
        issuesMap.set(epic, issues);
      }),
    );
    await Promise.all(issuesPromises);
  };
  useEffect(() => {
    const filtered = epics.filter((epic: Tag) =>
      epic.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredEpics(filtered);
  }, [searchTerm, epics]);

  return (
    <Box sx={{ width: '100%', backgroundColor: "#e0e0f8" }}>
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
      <Divider sx={{ bgcolor: "#666666", width: '100%' }} />
      {Array.from(issuesMap.keys()).map((epic: any) => (
        <Box key={epic.id} sx={{ width: '100%' }}>
          <Box sx={{ width: '100%', p: 2 }}>
            <ProgressBar issues={issuesMap.get(epic) || []} />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: '100%',
                mt: 1,
                "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
              }}
            >
              <Stars sx={{ mr: 1, color: "#673ab7" }} />
              <Typography
                sx={{
                  color: "#673ab7",
                  fontWeight: issuesMap.get(epic)?.length ? "bold" : "normal",
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
          <Divider sx={{ bgcolor: "#666666", width: '100%' }} />
        </Box>
      ))}
    </Box>
  );
};const getStatusPercentage = (
  issues: Issue[],
  predicate: (issue: Issue) => boolean,
): number => {
  if (!issues?.length) return 0;
  return (issues.filter(predicate).length / issues.length) * 100;
};

const ProgressBar: React.FC<{ issues: Issue[] }> = ({ issues }) => {
  const statusBars = [
    {
      predicate: (issue: Issue) => issue.status === STATUS_IN_PROGRESS,
      color: "#FFFFE0",
    },
    {
      predicate: (issue: Issue) => issue.status === STATUS_COMPLETED,
      color: "#c6d9b7",
    },
    {
      predicate: (issue: Issue) => issue.status === STATUS_ACCEPTED,
      color: "#a8c594",
    },
    {
      predicate: (issue: Issue) => issue.isIcebox,
      color: "#c9dff0",
    },
    {
      predicate: (issue: Issue) => !issue.isIcebox && !issue.status,
      color: "#f5f5f5",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "8px",
        bgcolor: "#e0e0e0",
        borderRadius: 1,
        border: "1px solid darkgrey",
      }}
    >
      {statusBars.map(({ predicate, color }, index) => (
        <Box
          key={index}
          sx={{
            width: `${getStatusPercentage(issues, predicate)}%`,
            bgcolor: color,
            height: "100%",
            borderRadius:
              index === 0
                ? "4px 0 0 4px"
                : index === statusBars.length - 1
                  ? "0 4px 4px 0"
                  : 0,
          }}
        />
      ))}
    </Box>
  );
};
export default EpicsComponent;
