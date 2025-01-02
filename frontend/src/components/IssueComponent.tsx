import React from "react";
import { Issue } from "../models/Issue";
import { Box, Typography, Chip, Stack } from "@mui/material";
import { PointsIcon } from "./PointsIcon";
import WorkTypeIcon from "./WorkTypeIcons";
import StatusButton from "./StatusButton";

interface IssueComponentProps {
  issue: Issue;
}

export const IssueComponent: React.FC<IssueComponentProps> = ({ issue }) => {
  return (
    <Box
      className="issue-container"
      sx={{
        border: "1px solid #ddd",
        borderRadius: 1,
        width: "100%",
        bgcolor: "#f5f5f5",
        padding: "5px",
      }}
    >
      <Stack direction="row" spacing={2}>
        <WorkTypeIcon id={issue.workType} />
        <Box display="flex" justifyContent="center" alignItems="center">
          <PointsIcon points={issue.points} />
        </Box>
        <Typography sx={{ color: "#000000", flexGrow: 1 }}>
          {issue.title}
        </Typography>
        <StatusButton status={issue.status} />
      </Stack>
    </Box>
  );
};
