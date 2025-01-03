import React from "react";
import { Issue } from "../models/Issue";
import { Box, Typography, Stack } from "@mui/material";
import { PointsIcon } from "./PointsIcon";
import WorkTypeIcon from "./WorkTypeIcons";
import StatusButton from "./StatusButton";
import { STATUS_IN_PROGRESS, STATUS_ACCEPTED } from "../services/StatusService";
import { IssueDetail } from "./IssueDetail";

interface IssueComponentProps {
  issue: Issue;
}

export const IssueComponent: React.FC<IssueComponentProps> = ({ issue }) => {
  const [expanded, setExpanded] = React.useState(true);

  const getBackgroundColor = (status: number) => {
    switch (status) {
      case STATUS_IN_PROGRESS:
        return "#FFFFE0";
      case STATUS_ACCEPTED:
        return "#c6d9b7";
      default:
        return "#f5f5f5";
    }
  };

  return (
    <Box>
      {expanded ? (
        <IssueDetail issue={issue} closeHandler={() => setExpanded(false)} />
      ) : (
        <Box
          className="issue-container"
          sx={{
            border: "1px solid #ddd",
            borderRadius: 1,
            width: "100%",

            bgcolor: getBackgroundColor(issue.status),
            padding: "5px",
            cursor: "move",
          }}
          onClick={() => setExpanded(true)}
        >
          <Stack direction="row" spacing={2}>
            <WorkTypeIcon id={issue.workType} />
            <Box display="flex" justifyContent="center" alignItems="center">
              <PointsIcon points={issue.points} />
            </Box>
            <Typography sx={{ flexGrow: 1, color: "black" }}>
              {issue.title}
            </Typography>
            <Box onClick={(e) => e.stopPropagation()}>
              <StatusButton
                status={issue.points === null ? null : issue.status}
                issueId={issue.id}
              />
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default IssueComponent;
